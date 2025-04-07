/**
 * Funções utilitárias para o processamento de eventos
 */

import crypto from 'crypto';
import { CustomData, GeoData, NormalizedCustomData, NormalizedEvent, NormalizedUserData, TrackRequest, UserData } from '../types';
import config from '../config';
import { getGeoIPInfo } from './geoip';

// Mapeamento de eventos do Shopify para eventos do Facebook
export const EVENT_MAPPING: Record<string, string> = {
  'PageView': 'PageView',
  'ViewHome': 'ViewHome',
  'ViewList': 'ViewContent',
  'ViewContent': 'ViewContent',
  'AddToCart': 'AddToCart',
  'ViewCart': 'ViewContent',
  'StartCheckout': 'InitiateCheckout',
  'RegisterDone': 'CompleteRegistration',
  'ShippingLoaded': 'AddPaymentInfo',
  'AddPaymentInfo': 'AddPaymentInfo',
  'Purchase': 'Purchase',
  'Purchase - credit_card': 'Purchase',
  'Purchase - pix': 'Purchase',
  'Purchase - billet': 'Purchase',
  'Purchase - paid_pix': 'Purchase',
  'Purchase - high_ticket': 'Purchase',
  'ViewCategory': 'ViewContent',
  'AddCoupon': 'AddToCart',
  'Refused - credit_card': 'CustomEvent',
  'Pesquisar': 'Search'
};

/**
 * Gera um ID de evento único
 * @returns {string} UUID v4
 */
export const generateEventId = (): string => {
  return crypto.randomUUID();
};

/**
 * Gera um hash SHA-256 para os dados
 * @param {string} data - Dados a serem hasheados
 * @returns {string | null} Hash SHA-256 ou null se os dados forem inválidos
 */
export const hashData = (data: string | undefined | null): string | null => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Normaliza e valida um evento
 * @param {TrackRequest} eventData - Dados do evento a serem normalizados
 * @returns {NormalizedEvent} Evento normalizado
 */
export const normalizeEvent = (eventData: TrackRequest): NormalizedEvent => {
  const { eventName, userData, customData } = eventData;
  
  // Verificar se o evento é válido
  if (!eventName || !EVENT_MAPPING[eventName]) {
    throw new Error(`Evento inválido: ${eventName}`);
  }
  
  // Mapear para o evento do Facebook
  const fbEventName = EVENT_MAPPING[eventName];
  
  // Obter IP do cliente
  const clientIP = userData?.ip || null;
  
  // Converter IPv6 para IPv4 se possível e processar apenas IPv4
  let ipToUse = clientIP;
  if (ipToUse && ipToUse.includes(':')) {
    // Se for IPv6 no formato ::ffff:IPv4, extrair apenas o IPv4
    if (ipToUse.includes('::ffff:')) {
      ipToUse = ipToUse.split('::ffff:')[1];
    } else {
      // Se for IPv6 puro, não usar para garantir compatibilidade com Facebook
      ipToUse = null;
    }
  }
  
  // Obter informações de geolocalização se o IP estiver disponível
  let geoData: GeoData | null = null;
  if (ipToUse) {
    geoData = getGeoIPInfo(ipToUse);
  }
  
  // Normalizar dados do usuário
  const normalizedUserData: NormalizedUserData = {
    em: userData?.email ? hashData(userData.email.toLowerCase().trim()) : null,
    ph: userData?.phone ? hashData(userData.phone.replace(/\D/g, '')) : null,
    fn: userData?.firstName ? hashData(userData.firstName.toLowerCase().trim()) : null,
    ln: userData?.lastName ? hashData(userData.lastName.toLowerCase().trim()) : null,
    external_id: userData?.userId || generateUserId(),
    client_ip_address: ipToUse,
    client_user_agent: userData?.userAgent || null,
    fbc: userData?.fbc || null,
    fbp: userData?.fbp || null,
    subscription_id: userData?.subscriptionId || null,
    fb_login_id: userData?.fbLoginId || null,
    lead_id: userData?.leadId || null,
    country: geoData?.country?.code || null,
    state: geoData?.region?.code || null,
    city: geoData?.city || null,
    zip: geoData?.postal || null,
  };
  
  // Normalizar dados personalizados
  const normalizedCustomData: NormalizedCustomData = {
    currency: customData?.currency || 'BRL',
    value: customData?.value || 0,
    content_name: customData?.contentName || null,
    content_category: customData?.contentCategory || null,
    content_ids: customData?.contentIds || null,
    content_type: customData?.contentType || null,
    order_id: customData?.orderId || null,
    num_items: customData?.numItems || null,
    search_string: customData?.searchString || null,
    status: customData?.status || null,
    predicted_ltv: customData?.predictedLtv || null,
    contents: customData?.contents || null,
    app: 'meta-tracking',
    language: userData?.language || (typeof navigator !== 'undefined' ? navigator.language : null) || 'pt-BR',
    referrer: customData?.referrer || userData?.referrer || null,
    event_time: Math.floor(Date.now() / 1000),
  };
  
  // Dados do servidor
  const serverData = {
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: customData?.sourceUrl || `https://${config.shopifyDomain}`,
    action_source: 'website',
    event_id: generateEventId(),
    geo_data: geoData,
  };
  
  return {
    eventName: fbEventName,
    userData: normalizedUserData,
    customData: normalizedCustomData,
    serverData,
  };
};

/**
 * Gera um ID de usuário persistente se não existir
 * @returns {string} ID de usuário
 */
export const generateUserId = (): string => {
  // Gerar um ID de usuário aleatório
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}; 