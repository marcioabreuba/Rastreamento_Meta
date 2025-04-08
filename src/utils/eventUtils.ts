/**
 * Funções utilitárias para o processamento de eventos
 */

import crypto from 'crypto';
import { CustomData, GeoData, NormalizedCustomData, NormalizedEvent, NormalizedUserData, TrackRequest, UserData } from '../types';
import config from '../config';
import { getGeoIPInfo, convertIPv4ToIPv6 } from './geoip';

// Mapeamento de eventos do Shopify para eventos do Facebook
export const EVENT_MAPPING: Record<string, string> = {
  'PageView': 'PageView',
  'ViewHome': 'ViewHome',
  'ViewList': 'ViewContent',
  'ViewContent': 'ViewContent',
  'Ver conteúdo': 'ViewContent',
  'AddToCart': 'AddToCart',
  'Adicionar ao carrinho': 'AddToCart',
  'ViewCart': 'ViewContent',
  'StartCheckout': 'InitiateCheckout',
  'Iniciar finalização da compra': 'InitiateCheckout',
  'RegisterDone': 'CompleteRegistration',
  'ShippingLoaded': 'AddPaymentInfo',
  'AddPaymentInfo': 'AddPaymentInfo',
  'Adicionar informações de pagamento': 'AddPaymentInfo',
  'Purchase': 'Purchase',
  'Comprar': 'Purchase',
  'Purchase - credit_card': 'Purchase',
  'Purchase - pix': 'Purchase',
  'Purchase - billet': 'Purchase',
  'Purchase - paid_pix': 'Purchase',
  'Purchase - high_ticket': 'Purchase',
  'ViewCategory': 'ViewContent',
  'AddCoupon': 'AddToCart',
  'Refused - credit_card': 'CustomEvent',
  'Pesquisar': 'Search',
  'Search': 'Search',
  // Novos eventos
  'ViewSearchResults': 'Search',
  'Timer_1min': 'CustomEvent',
  'Scroll_25': 'CustomEvent',
  'Scroll_50': 'CustomEvent',
  'Scroll_75': 'CustomEvent',
  'Scroll_100': 'CustomEvent'
};

/**
 * Verifica se todos os parâmetros requeridos estão presentes
 * @param {NormalizedUserData} userData - Dados do usuário normalizados
 * @returns {string[]} Lista de parâmetros faltantes
 */
export const validateRequiredParameters = (userData: NormalizedUserData): string[] => {
  const requiredParams: Array<keyof NormalizedUserData> = [
    'em', 'ph', 'fn', 'ln', 'ge', 'db', 'city', 'state', 'zip', 'country', 
    'external_id', 'client_ip_address', 'client_user_agent', 'fbc', 'fbp', 
    'subscription_id', 'fb_login_id', 'lead_id', 'ctwa_clid', 'ig_account_id',
    'ig_sid', 'page_id', 'page_scoped_user_id'
  ];
  
  const missingParams = requiredParams.filter(param => userData[param] === null);
  return missingParams;
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
  const { eventName, userData = {}, customData = {} } = eventData;

  // Verificar se o evento é válido
  if (!eventName || !EVENT_MAPPING[eventName]) {
    throw new Error(`Evento inválido: ${eventName}`);
  }
  
  // Mapear para o evento do Facebook
  const fbEventName = EVENT_MAPPING[eventName];
  
  // Determinar se é um evento de aplicativo
  const isAppEvent = eventData.isAppEvent || false;
  
  // Obter IP do cliente
  const clientIP = userData?.ip || null;
  
  // Converter para IPv6 para todos os eventos enviados para a API de Conversões
  let ipToUse = clientIP;
  if (ipToUse) {
    ipToUse = convertIPv4ToIPv6(ipToUse);
  }
  
  // Tentar obter informações de geolocalização baseadas no IP
  let geoData: GeoData | null = null;
  if (ipToUse) {
    try {
      geoData = getGeoIPInfo(ipToUse);
    } catch (error) {
      console.error('Erro ao obter informações de geolocalização:', error);
    }
  }

  // Mapeamento para transformar nomes camelCase em nomes com underscore
  const paramMapping: Record<string, string> = {
    'contentCategory': 'content_category',
    'contentIds': 'content_ids',
    'contentName': 'content_name',
    'contentType': 'content_type',
    'numItems': 'num_items',
    'orderId': 'order_id',
    'searchString': 'search_string',
    'predictedLtv': 'predicted_ltv'
  };

  // Normalizar dados do usuário
  const normalizedUserData: NormalizedUserData = {
    em: userData?.email ? hashData(userData.email.toLowerCase().trim()) : null,
    ph: userData?.phone ? hashData(userData.phone.replace(/\D/g, '')) : null,
    fn: userData?.firstName ? hashData(userData.firstName.toLowerCase().trim()) : null,
    ln: userData?.lastName ? hashData(userData.lastName.toLowerCase().trim()) : null,
    ge: userData?.gender ? hashData(userData.gender.toLowerCase().trim()) : null,
    db: userData?.dateOfBirth ? hashData(userData.dateOfBirth.trim()) : null,
    external_id: userData?.userId || generateUserId(),
    client_ip_address: ipToUse,
    client_user_agent: userData?.userAgent || null,
    fbc: userData?.fbc || null,
    fbp: userData?.fbp || null,
    subscription_id: userData?.subscriptionId || null,
    fb_login_id: userData?.fbLoginId || null,
    lead_id: userData?.leadId || null,
    country: userData?.country ? hashData(userData.country.toLowerCase().trim()) : (geoData?.country?.code ? hashData(geoData.country.code.toLowerCase()) : null),
    state: userData?.state ? hashData(userData.state.toLowerCase().trim()) : (geoData?.region?.code ? hashData(geoData.region.code.toLowerCase()) : null),
    city: userData?.city ? hashData(userData.city.toLowerCase().trim()) : (geoData?.city ? hashData(geoData.city.toLowerCase()) : null),
    zip: userData?.zip ? hashData(userData.zip.replace(/\D/g, '')) : (geoData?.postal ? hashData(geoData.postal) : null),
    // Novos parâmetros que não são específicos de app
    ctwa_clid: userData?.ctwaClid || null,
    ig_account_id: userData?.igAccountId || null,
    ig_sid: userData?.igSid || null,
    page_id: userData?.pageId || null,
    page_scoped_user_id: userData?.pageScopedUserId || null,
    
    // Parâmetros específicos de app - Definir como null para eventos web
    anon_id: null,
    madid: null,
    vendor_id: null
  };
  
  // Se for um evento de app, adicionar os parâmetros específicos
  if (isAppEvent) {
    normalizedUserData.anon_id = userData?.anonId || null;
    normalizedUserData.madid = userData?.madid || null;
    normalizedUserData.vendor_id = userData?.vendorId || null;
  }
  
  // Verificar parâmetros faltantes
  const missingParams = validateRequiredParameters(normalizedUserData);
  if (missingParams.length > 0) {
    console.warn(`Parâmetros obrigatórios faltando no evento ${eventName}:`, missingParams);
  }
  
  // Normalizar dados personalizados
  const normalizedCustomData: NormalizedCustomData = {
    currency: customData?.currency || 'BRL',
    value: customData?.value || 0,
    content_name: customData?.contentName || customData?.content_name || null,
    content_category: customData?.contentCategory || customData?.content_category || 
      (Array.isArray(customData?.contentIds) && customData?.contentIds.length ? 
        [customData.contentIds[0].split('-')[0]] : null),
    content_ids: customData?.contentIds || customData?.content_ids || null,
    content_type: customData?.contentType || customData?.content_type || "product_group",
    order_id: customData?.orderId || customData?.order_id || null,
    num_items: customData?.numItems || customData?.num_items || 1,
    search_string: customData?.searchString || customData?.search_string || null,
    status: customData?.status || null,
    predicted_ltv: customData?.predictedLtv || customData?.predicted_ltv || null,
    contents: customData?.contents || (customData?.contentIds ? 
      [{ 
        id: typeof customData.contentIds === 'string' ? 
          customData.contentIds : 
          (Array.isArray(customData.contentIds) && customData.contentIds.length > 0 ? 
            customData.contentIds[0] : ''),
        quantity: customData?.numItems || customData?.num_items || 1 
      }] : null),
    app: 'meta-tracking',
    language: userData?.language || (typeof navigator !== 'undefined' ? navigator.language : null) || 'pt-BR',
    referrer: customData?.referrer || userData?.referrer || null,
    event_time: Math.floor(Date.now() / 1000),
  };
  
  // Adicionar dados de app se for um evento de app
  if (isAppEvent) {
    normalizedCustomData.advertiser_tracking_enabled = customData?.advertiserTrackingEnabled ?? true;
    normalizedCustomData.application_tracking_enabled = customData?.applicationTrackingEnabled ?? true;
    normalizedCustomData.extinfo = customData?.extinfo || null;
    normalizedCustomData.campaign_ids = customData?.campaignIds || null;
    normalizedCustomData.install_referrer = customData?.installReferrer || null;
    normalizedCustomData.installer_package = customData?.installerPackage || null;
    normalizedCustomData.url_schemes = customData?.urlSchemes || null;
    normalizedCustomData.windows_attribution_id = customData?.windowsAttributionId || null;
  }
  
  // Preparar as opções de processamento de dados (para LGPD, CCPA, etc.)
  const dataProcessingOptions = eventData.dataProcessingOptions || [];
  const dataProcessingOptionsCountry = eventData.dataProcessingOptionsCountry || null;
  const dataProcessingOptionsState = eventData.dataProcessingOptionsState || null;
  
  // Dados do servidor
  const serverData = {
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: customData?.sourceUrl || `https://${config.shopifyDomain}`,
    action_source: isAppEvent ? 'app' : 'website',
    event_id: generateEventId(),
    geo_data: geoData,
    // Novos campos
    data_processing_options: dataProcessingOptions,
    data_processing_options_country: dataProcessingOptionsCountry,
    data_processing_options_state: dataProcessingOptionsState,
    referrer_url: customData?.referrer || userData?.referrer || null,
    customer_segmentation: eventData.customerSegmentation || null
  };
  
  return {
    eventName, // Usar o nome do evento original ao invés de fbEventName para manter os nomes originais
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