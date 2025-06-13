/**
 * Serviço para obter informações de geolocalização a partir de um endereço IP.
 * Encapsula a lógica de consulta ao banco de dados MaxMind GeoIP e tratamento de IP.
 */

import { Reader } from '@maxmind/geoip2-node';
import { GeoData } from '../../types';
import logger from '../../utils/logger';
import { normalizeBrazilianZipCode } from '../../utils/validators';

// Cache para CEPs obtidos via lookup reverso (evita requests repetidos)
const zipCodeCache = new Map<string, { zipCode: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos
const RATE_LIMIT_DELAY = 1100; // 1.1 segundos entre requests (respeitando limite do Nominatim)
let lastRequestTime = 0;

/**
 * Limpa entradas expiradas do cache de CEP
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of zipCodeCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      zipCodeCache.delete(key);
    }
  }
}

/**
 * Implementa rate limiting básico para respeitar limites da API
 */
async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    logger.debug(`[GeoIPService] Rate limiting: aguardando ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Obtém CEP preciso usando lookup reverso com coordenadas geográficas
 * @param latitude Latitude da localização
 * @param longitude Longitude da localização
 * @returns CEP de 8 dígitos ou null se não encontrado
 */
async function getPreciseZipCode(latitude: number, longitude: number): Promise<string | null> {
  try {
    // 1. Verificar cache primeiro
    const cacheKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    cleanExpiredCache(); // Limpar cache expirado
    
    const cached = zipCodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      logger.debug(`[GeoIPService] 🎯 CEP encontrado no cache: ${cached.zipCode} para ${latitude},${longitude}`);
      return cached.zipCode;
    }

    // 2. Rate limiting
    await respectRateLimit();

    // 3. Request para Nominatim (OpenStreetMap)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

    logger.debug(`[GeoIPService] 🔍 Fazendo lookup reverso para coordenadas: ${latitude},${longitude}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`,
      { 
        signal: controller.signal,
        headers: { 
          'User-Agent': 'meta-tracking-geoip/1.0 (contact@example.com)',
          'Accept': 'application/json'
        }
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[GeoIPService] ⚠️ Nominatim retornou status ${response.status} para ${latitude},${longitude}`);
      return null;
    }
    
    const data = await response.json();
    
    // 4. Extrair e validar CEP
    const zipCode = data.address?.postcode;
    
    if (zipCode) {
      // Validar formato de CEP brasileiro (XXXXX-XXX ou XXXXXXXX)
      const cleanZip = zipCode.replace(/\D/g, ''); // Remove tudo que não é dígito
      
      if (/^\d{8}$/.test(cleanZip)) {
        // CEP de 8 dígitos válido
        zipCodeCache.set(cacheKey, { zipCode: cleanZip, timestamp: Date.now() });
        
        logger.info(`[GeoIPService] 🎯 CEP preciso obtido via lookup reverso: ${cleanZip} (original: ${zipCode}) para ${latitude},${longitude}`);
        return cleanZip;
      } else if (/^\d{5}$/.test(cleanZip)) {
        // CEP de 5 dígitos - completar com zeros (melhor que o MaxMind genérico)
        const completedZip = cleanZip + '000';
        zipCodeCache.set(cacheKey, { zipCode: completedZip, timestamp: Date.now() });
        
        logger.info(`[GeoIPService] 🎯 CEP de 5 dígitos obtido via lookup reverso: ${completedZip} (original: ${zipCode}) para ${latitude},${longitude}`);
        return completedZip;
      } else {
        logger.warn(`[GeoIPService] ⚠️ CEP inválido retornado pelo Nominatim: ${zipCode} para ${latitude},${longitude}`);
      }
    } else {
      logger.debug(`[GeoIPService] 🔍 Nenhum CEP encontrado no lookup reverso para ${latitude},${longitude}`);
    }
    
    return null;
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.warn(`[GeoIPService] ⚠️ Timeout no lookup reverso de CEP para ${latitude},${longitude}`);
    } else {
      logger.warn(`[GeoIPService] ⚠️ Erro no lookup reverso de CEP para ${latitude},${longitude}:`, error.message);
    }
    return null;
  }
}

// Variável para armazenar a instância do leitor GeoIP (deve ser inicializada externamente)
let geoipReaderInstance: Reader | null = null;

export function setGeoIPReaderInstance(reader: Reader): void {
  geoipReaderInstance = reader;
}

/**
 * Verifica se um endereço IP é um IPv6 válido (não apenas IPv4-mapped).
 * @param {string} ip - Endereço IP
 * @returns {boolean} Verdadeiro se for IPv6 real
 */
function isRealIPv6(ip: string): boolean {
  if (!ip) return false;
  // Se contém : mas não é apenas um IPv4 mapeado (::ffff:)
  return ip.includes(':') &&
         !ip.startsWith('::ffff:') &&
         (ip.match(/:/g) || []).length > 1; // Mais de um : para confirmar que é IPv6 real
}

/**
 * Converte um endereço IPv4 para formato IPv6 mapeado ou mantém IPv6 real.
 * Útil para padronização antes de enviar para APIs que podem preferir IPv6.
 * @param {string} ip - Endereço IP (IPv4 ou IPv6)
 * @returns {string | null} Endereço IPv6 (real ou mapeado) ou null se inválido
 */
export function convertToIPv6Format(ip: string | null | undefined): string | null {
  if (!ip) return null;

  // Se já for um IPv6 real (não apenas IPv4-mapped), manter como está
  if (isRealIPv6(ip)) {
    return ip;
  }

  let potentialIPv4 = ip;
  // Se estiver no formato IPv4-mapped, extrair o IPv4
  if (potentialIPv4.includes('::ffff:')) {
    potentialIPv4 = potentialIPv4.split('::ffff:')[1];
  }

  // Validar formato IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = potentialIPv4.match(ipv4Regex);

  if (!match) {
    // Se não for IPv4 nem IPv6 real, pode ser um formato inválido ou inesperado
    logger.warn(`[GeoIPService] IP não reconhecido como IPv4 ou IPv6 real: ${ip}`);
    return ip; // Retorna o original em caso de dúvida
  }

  // Formato padrão para IPv6 mapeado a partir de IPv4
  return `::ffff:${potentialIPv4}`;
}

// Função removida - agora usando utilitário compartilhado

/**
 * Obtém informações de geolocalização a partir de um endereço IP.
 * Tenta buscar com o IP fornecido e, se for IPv4-mapped, tenta com o IPv4 extraído.
 * Inclui lookup reverso para obter CEPs mais precisos usando coordenadas.
 * @param {string} ip - Endereço IP (IPv4 ou IPv6)
 * @returns {Promise<GeoData | null>} Informações de geolocalização ou null se não encontradas/erro.
 */
export async function getGeoData(ip: string | null | undefined): Promise<GeoData | null> {
  if (!geoipReaderInstance || !ip || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    if (!geoipReaderInstance && ip) {
        logger.warn(`[GeoIPService] Instância do GeoIP Reader não inicializada ao tentar buscar IP: ${ip}`);
    }
    return null;
  }

  let ipToUse = ip;
  const originalIsIPv6Real = isRealIPv6(ip);

  try {
    // Tentativa 1: Usar o IP como está
    // @ts-ignore - O tipado oficial pode não incluir city corretamente
    const geoResult = geoipReaderInstance.city(ipToUse);

    // 🔍 LOG DOS DADOS BRUTOS DO MAXMIND (SEM TRATAMENTO)
    logger.info(`[GeoIPService] 📊 DADOS BRUTOS MAXMIND para IP ${ip}:`, {
      ip: ip,
      maxmind_raw: {
        country: {
          isoCode: geoResult.country?.isoCode || null,
          name: geoResult.country?.names?.en || null,
          names_all: geoResult.country?.names || null
        },
        subdivisions: geoResult.subdivisions?.map((sub: any) => ({
          isoCode: sub.isoCode || null,
          name: sub.names?.en || null,
          names_all: sub.names || null
        })) || null,
        city: {
          name: geoResult.city?.names?.en || null,
          names_all: geoResult.city?.names || null,
          geonameId: geoResult.city?.geonameId || null
        },
        postal: {
          code_original: geoResult.postal?.code || null,
          confidence: geoResult.postal?.confidence || null
        },
        location: {
          latitude: geoResult.location?.latitude || null,
          longitude: geoResult.location?.longitude || null,
          accuracyRadius: geoResult.location?.accuracyRadius || null,
          timeZone: geoResult.location?.timeZone || null
        },
        traits: {
          isAnonymousProxy: geoResult.traits?.isAnonymousProxy || null,
          isSatelliteProvider: geoResult.traits?.isSatelliteProvider || null,
          userType: geoResult.traits?.userType || null,
          autonomousSystemNumber: geoResult.traits?.autonomousSystemNumber || null,
          autonomousSystemOrganization: geoResult.traits?.autonomousSystemOrganization || null,
          domain: geoResult.traits?.domain || null,
          isp: geoResult.traits?.isp || null,
          organization: geoResult.traits?.organization || null
        }
      }
    });

    const countryCode = geoResult.country?.isoCode;
    let postalCode = geoResult.postal?.code;

    // 🎯 LOOKUP REVERSO PARA CEP MAIS PRECISO (apenas para Brasil)
    if (countryCode === 'BR' && geoResult.location?.latitude && geoResult.location?.longitude) {
      try {
        const preciseZip = await getPreciseZipCode(geoResult.location.latitude, geoResult.location.longitude);
        if (preciseZip) {
          logger.info(`[GeoIPService] 🚀 CEP melhorado via lookup reverso: ${postalCode} → ${preciseZip} para IP ${ip}`);
          postalCode = preciseZip;
        } else {
          logger.debug(`[GeoIPService] 📍 Lookup reverso não encontrou CEP melhor, usando MaxMind: ${postalCode} para IP ${ip}`);
        }
      } catch (error: any) {
        logger.warn(`[GeoIPService] ⚠️ Erro no lookup reverso, usando CEP do MaxMind: ${postalCode} para IP ${ip}`, error.message);
      }
    }

    // Normalizar CEP final (seja do MaxMind ou do lookup reverso)
    const finalPostalCode = normalizeBrazilianZipCode(postalCode, countryCode);

    return {
      ip: ip, // Retorna sempre o IP original recebido
      isIPv6: originalIsIPv6Real,
      country: geoResult.country ? { code: countryCode, name: geoResult.country.names?.en } : null,
      region: geoResult.subdivisions?.[0] ? { code: geoResult.subdivisions[0].isoCode, name: geoResult.subdivisions[0].names?.en } : null,
      city: geoResult.city?.names?.en || null,
      postal: finalPostalCode,
      location: geoResult.location ? {
        latitude: geoResult.location.latitude,
        longitude: geoResult.location.longitude,
        accuracyRadius: geoResult.location.accuracyRadius,
        timeZone: geoResult.location.timeZone
      } : null
    };

  } catch (primaryError: any) {
    // Tentativa 2: Se falhou e era IPv4-mapped, tentar com IPv4 extraído
    if (ip.includes('::ffff:') && ip.includes(':') && !originalIsIPv6Real) {
      try {
        ipToUse = ip.split('::ffff:')[1];
        logger.debug(`[GeoIPService] Falha na busca com ${ip}, tentando com IPv4 extraído: ${ipToUse}`);
        // @ts-ignore
        const geoResult = geoipReaderInstance.city(ipToUse);

        // 🔍 LOG DOS DADOS BRUTOS DO MAXMIND (FALLBACK)
        logger.info(`[GeoIPService] 📊 DADOS BRUTOS MAXMIND (fallback) para IP ${ip} (usando ${ipToUse}):`, {
          ip: ip,
          ip_used: ipToUse,
          maxmind_raw: {
            country: {
              isoCode: geoResult.country?.isoCode || null,
              name: geoResult.country?.names?.en || null,
              names_all: geoResult.country?.names || null
            },
                         subdivisions: geoResult.subdivisions?.map((sub: any) => ({
               isoCode: sub.isoCode || null,
               name: sub.names?.en || null,
               names_all: sub.names || null
             })) || null,
            city: {
              name: geoResult.city?.names?.en || null,
              names_all: geoResult.city?.names || null,
              geonameId: geoResult.city?.geonameId || null
            },
            postal: {
              code_original: geoResult.postal?.code || null,
              confidence: geoResult.postal?.confidence || null
            },
            location: {
              latitude: geoResult.location?.latitude || null,
              longitude: geoResult.location?.longitude || null,
              accuracyRadius: geoResult.location?.accuracyRadius || null,
              timeZone: geoResult.location?.timeZone || null
            },
            traits: {
              isAnonymousProxy: geoResult.traits?.isAnonymousProxy || null,
              isSatelliteProvider: geoResult.traits?.isSatelliteProvider || null,
              userType: geoResult.traits?.userType || null,
              autonomousSystemNumber: geoResult.traits?.autonomousSystemNumber || null,
              autonomousSystemOrganization: geoResult.traits?.autonomousSystemOrganization || null,
              domain: geoResult.traits?.domain || null,
              isp: geoResult.traits?.isp || null,
              organization: geoResult.traits?.organization || null
            }
          }
        });

        const countryCode = geoResult.country?.isoCode;
        let postalCode = geoResult.postal?.code;

        // 🎯 LOOKUP REVERSO PARA CEP MAIS PRECISO (fallback - apenas para Brasil)
        if (countryCode === 'BR' && geoResult.location?.latitude && geoResult.location?.longitude) {
          try {
            const preciseZip = await getPreciseZipCode(geoResult.location.latitude, geoResult.location.longitude);
            if (preciseZip) {
              logger.info(`[GeoIPService] 🚀 CEP melhorado via lookup reverso (fallback): ${postalCode} → ${preciseZip} para IP ${ip}`);
              postalCode = preciseZip;
            } else {
              logger.debug(`[GeoIPService] 📍 Lookup reverso (fallback) não encontrou CEP melhor, usando MaxMind: ${postalCode} para IP ${ip}`);
            }
          } catch (error: any) {
            logger.warn(`[GeoIPService] ⚠️ Erro no lookup reverso (fallback), usando CEP do MaxMind: ${postalCode} para IP ${ip}`, error.message);
          }
        }

        // Normalizar CEP final (seja do MaxMind ou do lookup reverso)
        const finalPostalCode = normalizeBrazilianZipCode(postalCode, countryCode);

        return {
          ip: ip, // Retorna sempre o IP original
          isIPv6: false, // Indica que a busca bem-sucedida usou IPv4
          country: geoResult.country ? { code: countryCode, name: geoResult.country.names?.en } : null,
          region: geoResult.subdivisions?.[0] ? { code: geoResult.subdivisions[0].isoCode, name: geoResult.subdivisions[0].names?.en } : null,
          city: geoResult.city?.names?.en || null,
          postal: finalPostalCode,
          location: geoResult.location ? {
            latitude: geoResult.location.latitude,
            longitude: geoResult.location.longitude,
            accuracyRadius: geoResult.location.accuracyRadius,
            timeZone: geoResult.location.timeZone
          } : null
        };
      } catch (fallbackError: any) { // Especificar tipo 'any' para 'fallbackError'
        logger.error(`[GeoIPService] Erro na busca GeoIP (fallback com ${ipToUse}): ${fallbackError.message}`, { ip: ip, error: fallbackError });
        return null;
      }
    } else {
      // Se não era IPv4-mapped ou erro na primeira tentativa com IP real
      // Não logar erro para IPs não encontrados, que é comum
      if (primaryError.code !== 'ADDRESS_NOT_FOUND' && primaryError.name !== 'AddressNotFoundError') {
          logger.error(`[GeoIPService] Erro na busca GeoIP (primária com ${ip}): ${primaryError.message}`, { ip: ip, error: primaryError });
      }
      return null;
    }
  }
} 