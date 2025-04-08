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
 * Valida e corrige o formato do FBP
 * @param {string | null} fbp - Valor do FBP a ser validado
 * @returns {string | null} FBP válido ou null
 */
export const validateFbp = (fbp: string | null): string | null => {
  if (!fbp) return null;
  
  // Verificar se já está no formato correto
  if (/^fb\.1\.\d+\.\d+$/.test(fbp)) {
    return fbp;
  }
  
  // Se começar com fb.2, corrigir para fb.1
  if (fbp.startsWith('fb.2.')) {
    return 'fb.1.' + fbp.substring(5);
  }
  
  // Se for um hash ou outro formato, gerar um novo FBP válido
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000);
  return `fb.1.${timestamp}.${random}`;
};

/**
 * Verifica se todos os parâmetros requeridos estão presentes
 * @param {NormalizedUserData} userData - Dados do usuário normalizados
 * @returns {string[]} Lista de parâmetros faltantes
 */
export const validateRequiredParameters = (userData: NormalizedUserData): string[] => {
  // Parâmetros realmente obrigatórios para o Facebook
  const requiredParams: Array<keyof NormalizedUserData> = [
    'external_id', 'client_ip_address', 'client_user_agent'
  ];
  
  // Parâmetros opcionais mas úteis para matching
  const optionalParams: Array<keyof NormalizedUserData> = [
    'em', 'ph', 'fn', 'ln', 'ge', 'db', 'city', 'state', 'zip', 'country', 
    'fbc', 'fbp', 'subscription_id', 'fb_login_id', 'lead_id', 'ctwa_clid', 
    'ig_account_id', 'ig_sid', 'page_id', 'page_scoped_user_id'
  ];
  
  const missingRequired = requiredParams.filter(param => userData[param] === null);
  const missingOptional = optionalParams.filter(param => userData[param] === null);
  
  // Registrar parâmetros opcionais faltantes com nível de log info
  if (missingOptional.length > 0) {
    console.info(`Parâmetros opcionais faltantes: ${missingOptional.join(', ')}`);
  }
  
  // Retornar apenas parâmetros obrigatórios faltantes
  return missingRequired;
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
    fbp: userData?.fbp ? validateFbp(userData.fbp) : null,
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
    value: customData?.value ? Math.round(Number(customData.value)) : 0,
    content_name: customData?.contentName || customData?.content_name || null,
    content_category: (() => {
      // Verificar se content_category já existe e está formatado como array
      const contentCategory = customData?.contentCategory || customData?.content_category;
      if (contentCategory) {
        return Array.isArray(contentCategory) ? contentCategory : [contentCategory];
      }
      
      // Verificar se content_ids existe para extrair categorias
      if (Array.isArray(customData?.contentIds) && customData?.contentIds.length) {
        // Extrair categoria do primeiro ID se possível (formato comum: categoria-id)
        const firstId = customData.contentIds[0];
        if (typeof firstId === 'string' && firstId.includes('-')) {
          return [firstId.split('-')[0]];
        }
      }
      
      // Usar informações do evento para definir uma categoria padrão
      const defaultCategory = 
        eventName === 'ViewHome' ? 'homepage' : 
        eventName === 'ViewContent' ? 'product' : 
        eventName === 'ViewList' || eventName === 'ViewCategory' ? 'category' : 
        eventName === 'Search' || eventName === 'ViewSearchResults' ? 'search' : 
        eventName === 'AddToCart' ? 'cart' : 
        eventName === 'Purchase' ? 'purchase' : 'general';
      
      return [defaultCategory];
    })(),
    content_ids: (() => {
      // Garantir que content_ids seja sempre um array se existir
      const contentIds = customData?.contentIds || customData?.content_ids;
      if (!contentIds) return null;
      return Array.isArray(contentIds) ? contentIds : [contentIds];
    })(),
    content_type: customData?.contentType || customData?.content_type || "product_group",
    order_id: customData?.orderId || customData?.order_id || null,
    num_items: customData?.numItems || customData?.num_items || 1,
    search_string: customData?.searchString || customData?.search_string || null,
    status: customData?.status || null,
    predicted_ltv: customData?.predictedLtv || customData?.predicted_ltv || null,
    contents: (() => {
      // Se já tiver contents formatado corretamente, use-o
      if (customData?.contents) {
        if (Array.isArray(customData.contents)) {
          // Verificar se cada item do array tem a estrutura correta {id, item_price, quantity}
          return customData.contents.map(item => {
            if (typeof item === 'object' && item !== null) {
              return {
                id: item.id || '',
                item_price: typeof item.item_price === 'number' ? item.item_price : 
                             (customData?.value ? Number(customData.value) : 0),
                quantity: typeof item.quantity === 'number' ? item.quantity : 
                          (customData?.numItems || customData?.num_items || 1)
              };
            }
            // Se o item não for um objeto, converter para o formato correto
            return {
              id: String(item),
              item_price: customData?.value ? Number(customData.value) : 0,
              quantity: customData?.numItems || customData?.num_items || 1
            };
          });
        }
        // Se contents não for um array, converter para array
        return [{
          id: String(customData.contents),
          item_price: customData?.value ? Number(customData.value) : 0,
          quantity: customData?.numItems || customData?.num_items || 1
        }];
      }
      
      // Se não tiver contents, mas tiver content_ids, criar contents baseado neles
      const contentIds = customData?.contentIds || customData?.content_ids;
      if (contentIds) {
        if (Array.isArray(contentIds)) {
          return contentIds.map(id => ({
            id: String(id),
            item_price: customData?.value ? Number(customData.value) / contentIds.length : 0,
            quantity: customData?.numItems || customData?.num_items || 1
          }));
        }
        return [{
          id: String(contentIds),
          item_price: customData?.value ? Number(customData.value) : 0,
          quantity: customData?.numItems || customData?.num_items || 1
        }];
      }
      
      return null;
    })(),
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