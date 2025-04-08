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
 * Converte um endereço IPv4 para formato IPv6
 * @param {string} ipv4 - Endereço IPv4
 * @returns {string} Endereço em formato IPv6
 */
export function convertIPv4ToIPv6(ipv4: string): string {
  // Verifica se já é IPv6
  if (ipv4.includes(':')) {
    return ipv4;
  }
  
  // Validar formato IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ipv4.match(ipv4Regex);
  
  if (!match) {
    return ipv4; // Retorna o original se não for um IPv4 válido
  }
  
  // Formato padrão para IPv6 mapeado a partir de IPv4
  return `::ffff:${ipv4}`;
}

/**
 * Obtém informações de geolocalização a partir de um endereço IP
 * @param {string} ip - Endereço IP
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
    
    // Se for IPv6, tentar extrair IPv4 se estiver no formato ::ffff:IPv4
    let ipToUse = ip;
    if (ip.includes(':') && ip.includes('::ffff:')) {
      ipToUse = ip.split('::ffff:')[1];
    }
    
    // Agora aceitamos IPv6 puro para compatibilidade com o Facebook
    
    // Obter informações de geolocalização
    // @ts-ignore - O tipado oficial não está incluindo o método city corretamente
    const geoData = geoipReader.city(ipToUse);
    
    // Formatar os dados
    return {
      ip,
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
  } catch (error) {
    console.error(`Erro ao obter informações de geolocalização para IP ${ip}:`, error);
    return null;
  }
} 