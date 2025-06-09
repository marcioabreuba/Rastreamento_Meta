/**
 * Serviço para obter informações de geolocalização a partir de um endereço IP.
 * Encapsula a lógica de consulta ao banco de dados MaxMind GeoIP e tratamento de IP.
 */

import { Reader } from '@maxmind/geoip2-node';
import { GeoData } from '../../types';
import logger from '../../utils/logger';
import { normalizeBrazilianZipCode } from '../../utils/validators';

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
 * @param {string} ip - Endereço IP (IPv4 ou IPv6)
 * @returns {GeoData | null} Informações de geolocalização ou null se não encontradas/erro.
 */
export function getGeoData(ip: string | null | undefined): GeoData | null {
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

    const countryCode = geoResult.country?.isoCode;
    const postalCode = normalizeBrazilianZipCode(geoResult.postal?.code, countryCode);

    return {
      ip: ip, // Retorna sempre o IP original recebido
      isIPv6: originalIsIPv6Real,
      country: geoResult.country ? { code: countryCode, name: geoResult.country.names?.en } : null,
      region: geoResult.subdivisions?.[0] ? { code: geoResult.subdivisions[0].isoCode, name: geoResult.subdivisions[0].names?.en } : null,
      city: geoResult.city?.names?.en || null,
      postal: postalCode,
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

        const countryCode = geoResult.country?.isoCode;
        const postalCode = normalizeBrazilianZipCode(geoResult.postal?.code, countryCode);

        return {
          ip: ip, // Retorna sempre o IP original
          isIPv6: false, // Indica que a busca bem-sucedida usou IPv4
          country: geoResult.country ? { code: countryCode, name: geoResult.country.names?.en } : null,
          region: geoResult.subdivisions?.[0] ? { code: geoResult.subdivisions[0].isoCode, name: geoResult.subdivisions[0].names?.en } : null,
          city: geoResult.city?.names?.en || null,
          postal: postalCode,
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