/**
 * Utilitário para geolocalização usando MaxMind GeoIP
 */

import fs from 'fs';
import { Reader } from '@maxmind/geoip2-node';
import config from '../config';
import { GeoData } from '../types';

// Variável para armazenar a instância do leitor GeoIP
let geoipReader: Reader | null = null;

/**
 * Inicializa o leitor GeoIP
 */
export async function initGeoIP(): Promise<boolean> {
  try {
    if (fs.existsSync(config.geoipDbPath)) {
      geoipReader = await Reader.open(config.geoipDbPath);
      console.log('Banco de dados GeoIP carregado com sucesso');
      return true;
    } else {
      console.warn(`Banco de dados GeoIP não encontrado em ${config.geoipDbPath}`);
      console.warn('Execute o script download-geoip.js para baixar o banco de dados');
      return false;
    }
  } catch (error) {
    console.error('Erro ao inicializar o leitor GeoIP:', error);
    return false;
  }
}

/**
 * Verifica se um endereço IP é um IPv6 válido (não apenas IPv4-mapped)
 * @param {string} ip - Endereço IP
 * @returns {boolean} Verdadeiro se for IPv6 real
 */
export function isRealIPv6(ip: string): boolean {
  // Se contém : mas não é apenas um IPv4 mapeado (::ffff:)
  return ip.includes(':') && 
         !ip.startsWith('::ffff:') && 
         ip.match(/:/g)!.length > 1; // Mais de um : para confirmar que é IPv6 real
}

/**
 * Converte um endereço IPv4 para formato IPv6 ou mantém IPv6 real
 * @param {string} ip - Endereço IP (IPv4 ou IPv6)
 * @returns {string} Endereço IPv6 (real ou mapeado)
 */
export function convertIPv4ToIPv6(ip: string): string {
  // Se já for um IPv6 real (não apenas IPv4-mapped), manter como está
  if (isRealIPv6(ip)) {
    return ip;
  }
  
  // Se estiver no formato IPv4-mapped, extrair o IPv4
  if (ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }
  
  // Validar formato IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  
  if (!match) {
    return ip; // Retorna o original se não for um IPv4 válido
  }
  
  // Formato padrão para IPv6 mapeado a partir de IPv4
  return `::ffff:${ip}`;
}

/**
 * Obtém informações de geolocalização a partir de um endereço IP
 * @param {string} ip - Endereço IP (IPv4 ou IPv6)
 * @returns {GeoData | null} Informações de geolocalização
 */
export function getGeoIPInfo(ip: string): GeoData | null {
  if (!geoipReader) {
    return null;
  }
  
  try {
    // Verificar se o IP é válido
    if (!ip || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }
    
    // Usar o IP como está inicialmente, especialmente se for IPv6 real
    let ipToUse = ip;
    let usedIPv6 = isRealIPv6(ip);
    
    try {
      // Tentar obter informações de geolocalização com o IP como está
      // @ts-ignore - O tipado oficial não está incluindo o método city corretamente
      const geoData = geoipReader.city(ipToUse);
      
      // Formatar os dados
      return {
        ip,
        isIPv6: usedIPv6,
        country: geoData.country ? {
          code: geoData.country.isoCode,
          name: geoData.country.names.en
        } : null,
        region: geoData.subdivisions && geoData.subdivisions.length > 0 ? {
          code: geoData.subdivisions[0].isoCode,
          name: geoData.subdivisions[0].names.en
        } : null,
        city: geoData.city ? geoData.city.names.en : null,
        postal: geoData.postal ? geoData.postal.code : null,
        location: geoData.location ? {
          latitude: geoData.location.latitude,
          longitude: geoData.location.longitude,
          accuracyRadius: geoData.location.accuracyRadius,
          timeZone: geoData.location.timeZone
        } : null
      };
    } catch (primaryError) {
      // Se falhar e for IPv6 no formato ::ffff:IPv4, tentar extrair o IPv4
      if (ip.includes(':') && ip.includes('::ffff:')) {
        try {
          ipToUse = ip.split('::ffff:')[1];
          // @ts-ignore
          const geoData = geoipReader.city(ipToUse);
          
          // Formatar os dados (mantendo o IP original)
          return {
            ip,
            isIPv6: false, // Indicar que usamos IPv4 para a busca
            country: geoData.country ? {
              code: geoData.country.isoCode,
              name: geoData.country.names.en
            } : null,
            region: geoData.subdivisions && geoData.subdivisions.length > 0 ? {
              code: geoData.subdivisions[0].isoCode,
              name: geoData.subdivisions[0].names.en
            } : null,
            city: geoData.city ? geoData.city.names.en : null,
            postal: geoData.postal ? geoData.postal.code : null,
            location: geoData.location ? {
              latitude: geoData.location.latitude,
              longitude: geoData.location.longitude,
              accuracyRadius: geoData.location.accuracyRadius,
              timeZone: geoData.location.timeZone
            } : null
          };
        } catch (fallbackError) {
          console.error(`Erro ao obter informações de geolocalização para IPv4 extraído ${ipToUse}:`, fallbackError);
          throw fallbackError; // Repassar o erro
        }
      } else {
        // Se não for um IPv4-mapped, repassar o erro original
        throw primaryError;
      }
    }
  } catch (error) {
    console.error(`Erro ao obter informações de geolocalização para IP ${ip}:`, error);
    return null;
  }
} 