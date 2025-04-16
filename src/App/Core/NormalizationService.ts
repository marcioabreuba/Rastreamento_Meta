/**
 * Serviço para normalizar e hashear dados de eventos para o formato da Meta CAPI.
 */

import crypto from 'crypto';
import { ServerEvent, ServerUserData, ServerCustomData } from '../Model/ServerEventParams';
import { WebEventParams, WebUserData, WebCustomData } from '../Model/WebEventParams'; // Pode ser útil para obter tipos de entrada
import { GeoData } from '../../types'; // Ajustar caminho
import logger from '../../utils/logger'; // Ajustar caminho
import { convertToIPv6Format } from './GeoIPService'; // Importar função de conversão de IP
import config from '../../config'; // Ajustar caminho

// Mapeamento de nomes de eventos internos para nomes de eventos padrão da Meta CAPI
export const EVENT_NAME_MAPPING: Record<string, string> = {
  // Eventos padrão
  'PageView': 'PageView',
  'ViewContent': 'ViewContent',
  'Search': 'Search',
  'AddToCart': 'AddToCart',
  'InitiateCheckout': 'InitiateCheckout',
  'AddPaymentInfo': 'AddPaymentInfo',
  'Purchase': 'Purchase',
  'Lead': 'Lead',
  'CompleteRegistration': 'CompleteRegistration',
  'AddToWishlist': 'AddToWishlist',

  // Mapeamentos Específicos (onde o nome interno difere do padrão Meta ou não há padrão)
  'ViewHome': 'PageView',        // Mapear ViewHome para PageView no servidor
  'ViewList': 'ViewContent',     // Lista de produtos é um tipo de ViewContent
  'ViewCart': 'ViewContent',     // Carrinho também é um tipo de ViewContent
  'ViewCategory': 'ViewContent', // Página de categoria é um tipo de ViewContent
  'Pesquisar': 'Search',         // Alias
  'ViewSearchResults': 'Search', // Alias
  'StartCheckout': 'InitiateCheckout', // Alias
  'RegisterDone': 'CompleteRegistration', // Alias
  'ShippingLoaded': 'AddPaymentInfo',   // Mapeado para evento de pagamento
  'AddCoupon': 'AddToCart',          // Cupom geralmente relacionado ao carrinho/adição
  'Ver conteúdo': 'ViewContent', // Alias
  'Adicionar ao carrinho': 'AddToCart', // Alias
  'Adicionar informações de pagamento': 'AddPaymentInfo', // Alias

  // Aliases de Compra
  'Purchase_credit_card': 'Purchase',
  'Purchase_pix': 'Purchase',
  'Purchase_billet': 'Purchase',
  'Purchase - paid_pix': 'Purchase',
  'Purchase - high_ticket': 'Purchase',

  // Eventos Customizados (mantêm o nome ou mapeiam para 'CustomEvent')
  'PlayVideo': 'PlayVideo',             // Usar nome customizado
  'ViewVideo_25': 'ViewVideo_25',       // Usar nome customizado
  'ViewVideo_50': 'ViewVideo_50',
  'ViewVideo_75': 'ViewVideo_75',
  'ViewVideo_90': 'ViewVideo_90',
  'Timer_1min': 'Timer_1min',
  'Scroll_25': 'Scroll_25',
  'Scroll_50': 'Scroll_50',
  'Scroll_75': 'Scroll_75',
  'Scroll_90': 'Scroll_90',
  'Refused - credit_card': 'Refused_CreditCard' // Nome customizado
};

/**
 * Gera um hash SHA-256 para os dados após normalização básica.
 * @param {string | number | undefined | null} data - Dado a ser hasheado.
 * @param {string} type - Tipo do dado para normalização específica (ex: 'email', 'phone', 'name', 'geo').
 * @returns {string | null} Hash SHA-256 ou null se os dados forem inválidos/vazios.
 */
function hashData(data: string | number | undefined | null, type: 'email' | 'phone' | 'name' | 'geo' | 'generic'): string | null {
  if (data === undefined || data === null || data === '') return null;

  let normalizedData = String(data).trim();

  switch (type) {
    case 'email':
    case 'name':
      normalizedData = normalizedData.toLowerCase();
      // Remover acentos/diacríticos (opcional, mas recomendado pelo histórico)
      normalizedData = normalizedData.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      break;
    case 'phone':
      normalizedData = normalizedData.replace(/\D/g, ''); // Manter apenas dígitos
      break;
    case 'geo': // Para cidade, estado, país
      normalizedData = normalizedData.toLowerCase();
      normalizedData = normalizedData.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      break;
    case 'generic': // Para external_id, etc.
    default:
      // Nenhuma normalização extra além de trim
      break;
  }

  if (!normalizedData) return null;

  return crypto.createHash('sha256').update(normalizedData).digest('hex');
}

/**
 * Normaliza o CEP brasileiro (movido para GeoIPService, mas pode ser chamado de lá).
 * Esta função é mantida aqui caso precise ser usada separadamente.
 * @param {string | null} zipCode - CEP
 * @param {string | null} countryCode - Código do país
 * @returns {string | null} CEP normalizado
 */
function normalizeBrazilianZipCode(zipCode: string | null, countryCode: string | null): string | null {
    if (!zipCode || !countryCode || countryCode.toLowerCase() !== 'br') {
        return zipCode || null;
    }
    const numericZip = zipCode.replace(/\D/g, '');
    if (numericZip.length > 0 && numericZip.length < 8) {
        return numericZip.padEnd(8, '0');
    }
    return numericZip || null;
}

/**
 * Valida e corrige o formato do FBP.
 * @param {string | null} fbp - Valor do FBP a ser validado.
 * @returns {string | null} FBP válido ou null.
 */
function validateFbp(fbp: string | null): string | null {
  if (!fbp) return null;
  // Formato correto: fb.1.timestamp.randomnumber
  if (/^fb\.1\.\d+\.\d+$/.test(fbp)) {
    return fbp;
  }
  // Tenta corrigir formatos comuns (ex: vindo de SDKs)
  if (fbp.startsWith('fb.0.') || fbp.startsWith('fb.2.')) {
      const parts = fbp.split('.');
      if (parts.length === 4) {
          return `fb.1.${parts[2]}.${parts[3]}`;
      }
  }
  // Se não for reconhecido, não retorna nada para evitar enviar inválido
  logger.warn(`[NormalizationService] FBP inválido recebido: ${fbp}`);
  return null;
}

/**
 * Gera um ID de evento único (UUID v4).
 * @returns {string} UUID v4.
 */
export function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Gera um fallback de ID de usuário.
 * @returns {string} ID de usuário fallback hasheado.
 */
function generateUserIdFallback(): string {
  // Gera um UUID e o hasheia para consistência
  const fallbackId = crypto.randomUUID();
  return hashData(fallbackId, 'generic') || `fallback_${Date.now()}`;
}

/**
 * Normaliza os dados do usuário para o formato CAPI.
 * @param {WebUserData | any} rawUserData - Dados brutos do usuário (podem vir do frontend ou backend).
 * @param {GeoData | null} geoData - Dados de geolocalização obtidos.
 * @param {string | null} clientIp - IP do cliente.
 * @param {string | null} userAgent - User Agent do cliente.
 * @returns {ServerUserData} Dados do usuário normalizados e hasheados.
 */
function normalizeUserData(rawUserData: WebUserData | any = {}, geoData: GeoData | null, clientIp: string | null, userAgent: string | null): ServerUserData {
  const countryCode = rawUserData?.country?.toLowerCase() || geoData?.country?.code?.toLowerCase() || null;
  const zipCode = normalizeBrazilianZipCode(rawUserData?.zp || geoData?.postal, countryCode);

  return {
    // Hashed
    em: hashData(rawUserData?.em, 'email'),
    ph: hashData(rawUserData?.ph, 'phone'),
    fn: hashData(rawUserData?.fn, 'name'),
    ln: hashData(rawUserData?.ln, 'name'),
    ge: hashData(rawUserData?.ge, 'generic'), // Gênero: f ou m (hash)
    db: hashData(rawUserData?.db, 'generic'), // Data Nasc: YYYYMMDD (hash)
    ct: hashData(rawUserData?.ct || geoData?.city, 'geo'),
    st: hashData(rawUserData?.st || geoData?.region?.code, 'geo'),
    zp: hashData(zipCode, 'generic'), // CEP já normalizado (hash)
    country: hashData(countryCode, 'geo'),
    external_id: hashData(rawUserData?.external_id, 'generic') || generateUserIdFallback(), // Hash do ID externo ou fallback

    // Non-Hashed
    client_ip_address: convertToIPv6Format(clientIp), // Garante formato IPv6
    client_user_agent: userAgent,
    fbp: validateFbp(rawUserData?.fbp), // Valida FBP
    fbc: rawUserData?.fbc || null, // FBC não precisa de validação complexa
    subscription_id: rawUserData?.subscription_id || null,
    fb_login_id: rawUserData?.fb_login_id || null,
    lead_id: rawUserData?.lead_id || null,
  };
}

/**
 * Normaliza os dados personalizados para o formato CAPI (snake_case).
 * @param {WebCustomData | any} rawCustomData - Dados brutos personalizados.
 * @param {string} eventName - Nome do evento original (para lógicas específicas).
 * @returns {ServerCustomData} Dados personalizados normalizados.
 */
function normalizeCustomData(rawCustomData: WebCustomData | any = {}, eventName: string): ServerCustomData {
  const normalized: ServerCustomData = {};

  // Mapeamento e Normalização
  normalized.value = (rawCustomData.value !== undefined && rawCustomData.value !== null) ? Number(rawCustomData.value) : null;
  normalized.currency = rawCustomData.currency || 'BRL'; // Padrão BRL
  normalized.order_id = rawCustomData.order_id || rawCustomData.orderId || null;
  normalized.num_items = rawCustomData.num_items || rawCustomData.numItems || null;

  // Tratamento especial para content_name (deve ser string)
  if (eventName === 'ViewCart' || eventName === 'AddToCart') { // E talvez InitiateCheckout/Purchase
    if (Array.isArray(rawCustomData.content_name)) {
        if (rawCustomData.content_name.length === 1) {
            normalized.content_name = String(rawCustomData.content_name[0]);
        } else if (rawCustomData.content_name.length > 1) {
            // Exemplo: "Produto A e mais X itens"
            normalized.content_name = `${String(rawCustomData.content_name[0])} e mais ${rawCustomData.content_name.length - 1} itens`;
        } else {
            normalized.content_name = null; // Array vazio
        }
    } else if (rawCustomData.content_name) {
        normalized.content_name = String(rawCustomData.content_name);
    } else {
        normalized.content_name = null;
    }
  } else {
      normalized.content_name = rawCustomData.content_name || rawCustomData.contentName || null;
  }

  normalized.content_category = rawCustomData.content_category || rawCustomData.contentCategory || null;
  normalized.content_ids = rawCustomData.content_ids || rawCustomData.contentIds || null;
  normalized.content_type = rawCustomData.content_type || rawCustomData.contentType || null;
  normalized.contents = rawCustomData.contents || null; // Assumindo que já está no formato correto
  normalized.search_string = rawCustomData.search_string || rawCustomData.searchString || null;
  normalized.status = rawCustomData.status || null;
  normalized.predicted_ltv = rawCustomData.predicted_ltv || rawCustomData.predictedLtv || null;

  // Adiciona campos não mapeados diretamente (mantendo snake_case se possível)
  for (const key in rawCustomData) {
    if (!normalized.hasOwnProperty(key) && !key.match(/[A-Z]/)) { // Ignora chaves já mapeadas ou camelCase
        // @ts-ignore
        normalized[key] = rawCustomData[key];
    }
  }

  // Garantir que campos numéricos sejam números
  if (normalized.value !== null) normalized.value = Number(normalized.value);
  if (normalized.num_items !== null) normalized.num_items = Number(normalized.num_items);
  if (normalized.predicted_ltv !== null) normalized.predicted_ltv = Number(normalized.predicted_ltv);

  // Remover campos nulos ou indefinidos para limpeza
  Object.keys(normalized).forEach(key => {
      // @ts-ignore
      if (normalized[key] === null || normalized[key] === undefined) {
            // @ts-ignore
          delete normalized[key];
      }
  });

  return normalized;
}

/**
 * Interface para os dados brutos recebidos pelo serviço de normalização.
 */
export interface RawEventInput {
    eventName: string;
    eventId?: string | null; // ID do evento (opcional, pode ser gerado)
    sourceUrl?: string | null;
    referrer?: string | null;
    clientIp: string | null;
    userAgent: string | null;
    isAppEvent?: boolean;
    isServerEvent?: boolean;
    userData?: WebUserData | any;
    customData?: WebCustomData | any;
    geoData: GeoData | null; // Dados Geo já enriquecidos
    // Campos opcionais para Data Processing Options
    dataProcessingOptions?: string[];
    dataProcessingOptionsCountry?: number;
    dataProcessingOptionsState?: number;
}

/**
 * Normaliza um evento completo para o formato da CAPI.
 * @param {RawEventInput} rawEvent - Dados brutos do evento.
 * @returns {ServerEvent | null} Evento normalizado pronto para envio ou null se inválido.
 */
export function normalizeEventForCAPI(rawEvent: RawEventInput): ServerEvent | null {
  if (!rawEvent || !rawEvent.eventName) {
    logger.error('[NormalizationService] Event name is missing in raw event data.');
    return null;
  }

  const mappedEventName = EVENT_NAME_MAPPING[rawEvent.eventName] || rawEvent.eventName;

  // Se mesmo após o mapeamento o evento não for reconhecido (ex: era um alias inválido)
  // Pode-se optar por logar e descartar, ou enviar com o nome original mapeado.
  // if (!Object.values(EVENT_NAME_MAPPING).includes(mappedEventName)) {
  //    logger.warn(`[NormalizationService] Event name '${rawEvent.eventName}' mapped to '${mappedEventName}' is not a standard or known custom event.`);
  // }

  const serverUserData = normalizeUserData(
    rawEvent.userData,
    rawEvent.geoData,
    rawEvent.clientIp,
    rawEvent.userAgent
  );

  const serverCustomData = normalizeCustomData(rawEvent.customData, rawEvent.eventName);

  // Validar se temos o mínimo necessário (IP, UserAgent, external_id)
  if (!serverUserData.client_ip_address || !serverUserData.client_user_agent || !serverUserData.external_id) {
      logger.warn(`[NormalizationService] Evento ${mappedEventName} faltando parâmetros essenciais (IP, UserAgent ou ExternalId). Verifique a coleta de dados.`, { eventName: rawEvent.eventName });
      // Decide se quer descartar ou enviar mesmo assim
      // return null;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const actionSource = rawEvent.isAppEvent ? 'app' : 'website'; // Simplificado por enquanto

  const serverEvent: ServerEvent = {
    event_name: mappedEventName,
    event_time: eventTime,
    event_source_url: rawEvent.sourceUrl || rawEvent.userData?.sourceUrl || null,
    action_source: actionSource,
    event_id: rawEvent.eventId || generateEventId(),
    user_data: serverUserData,
    custom_data: Object.keys(serverCustomData).length > 0 ? serverCustomData : undefined, // Não enviar custom_data vazio
    data_processing_options: rawEvent.dataProcessingOptions || [],
    data_processing_options_country: rawEvent.dataProcessingOptionsCountry || 0,
    data_processing_options_state: rawEvent.dataProcessingOptionsState || 0,
    opt_out: false, // Assumindo que não há opt-out por padrão
  };

  return serverEvent;
} 