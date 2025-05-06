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
  'ViewHome': 'PageView',        
  'ViewList': 'ViewList',     
  'ViewCart': 'ViewCart',     
  'ViewCategory': 'ViewCategory', 
  'Pesquisar': 'Search',         // Alias
  'ViewSearchResults': 'ViewSearchResults', // Alias
  'StartCheckout': 'InitiateCheckout', // Alias
  'RegisterDone': 'CompleteRegistration', // Alias
  'ShippingLoaded': 'AddPaymentInfo',   
  'AddCoupon': 'AddToCart',          
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
      // Se o número resultante tiver menos de 7 dígitos, é inválido para match
      if (normalizedData.length < 7) {
          logger.warn(`[NormalizationService] Número de telefone normalizado (${normalizedData}) muito curto (< 7 dígitos). Retornando null.`);
          return null;
      }
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
  // --- Lógica de validação de estrutura (sugerida) ---
  if (!fbp) return null;
  const trimmed = fbp.trim();

  // Aceita fb.0, fb.1, fb.2, fb.10 ... desde que a estrutura esteja correta
  // Usa [0-9]+? para permitir múltiplos dígitos no sub-domain index
  if (/^fb\.[0-9]+?\.\d+\.\d+$/.test(trimmed)) {
      logger.debug(`[NormalizationService] Usando _fbp validado: ${trimmed}`);
      return trimmed;
  }

  // Se a estrutura não for válida, loga e RETORNA NULL
  logger.warn(`[NormalizationService] _fbp em formato inesperado ou inválido: ${trimmed}. Descartando.`);
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

  // Normaliza external_id antes do hash
  const externalIdInput = rawUserData?.external_id;
  const normalizedExternalIdForHash = externalIdInput ? String(externalIdInput).trim().toLowerCase() : null; // << ADICIONADO: .toLowerCase()

  // --- LÓGICA FBC REVISADA PARA CONFORMIDADE COM DOCS CAPI ---
  let finalFbc: string | null = null;
  const rawFbcInput = rawUserData?.fbc;

  if (rawFbcInput) {
    const trimmedFbcInput = String(rawFbcInput).trim();
    // Regex estrito para validar formato _fbc COMPLETO (fb.subdomain.timestamp.clickid)
    const fbcRegex = /^fb\.[0-9]+\.\d+\.[A-Za-z0-9_\-]+$/;

    if (fbcRegex.test(trimmedFbcInput)) {
      // Se já está no formato correto, usar como está
      finalFbc = trimmedFbcInput;
      logger.debug(`[NormalizationService] Usando _fbc pré-formatado e validado: ${finalFbc}`);
    } else {
      // Se NÃO está no formato _fbc completo, verificar se parece ser um fbclid bruto
      // Assumimos que qualquer string não vazia aqui pode ser um fbclid,
      // pois o frontend envia o fbclid neste campo se o cookie _fbc não existir.
      // Uma validação mais robusta do fbclid poderia ser adicionada se necessário.
      if (trimmedFbcInput.length > 10) { // Checagem simples: fbclid geralmente é longo
        const creationTime = Date.now(); // Timestamp em ms para formatação
        // Formatar conforme documentação CAPI: fb.1.timestamp.fbclidValue
        finalFbc = `fb.1.${creationTime}.${trimmedFbcInput}`;
        logger.info(`[NormalizationService] Formatando fbclid bruto recebido para formato _fbc: ${finalFbc}`);
      } else {
        // Se não passou na validação de formato _fbc e não parece ser fbclid bruto
        logger.warn(`[NormalizationService] Valor de fbc recebido ('${trimmedFbcInput}') não está no formato _fbc válido e não foi formatado como fbclid. Descartando.`);
        finalFbc = null; // Garante que é null se inválido
      }
    }
  } else {
    // Se nenhum valor fbc/fbclid foi recebido
    logger.debug(`[NormalizationService] Nenhum valor fbc/fbclid recebido.`);
    finalFbc = null;
  }
  // --- FIM DA LÓGICA FBC REVISADA ---

  // --- MODIFICADO: Construir objeto e adicionar fbc/fbp condicionalmente ---
  const userData: ServerUserData = {
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
    external_id: hashData(normalizedExternalIdForHash, 'generic') || generateUserIdFallback(),

    // Non-Hashed (Inicial)
    client_ip_address: convertToIPv6Format(clientIp), // Garante formato IPv6
    client_user_agent: userAgent,
    subscription_id: rawUserData?.subscription_id || null,
    fb_login_id: rawUserData?.fb_login_id || null,
    lead_id: rawUserData?.lead_id || null,
  };

  // Adicionar fbp somente se for válido
  const finalFbp = validateFbp(rawUserData?.fbp);
  if (finalFbp) {
    userData.fbp = finalFbp;
  }

  // Adicionar fbc somente se for válido ou formatado
  if (finalFbc) {
    userData.fbc = finalFbc;
  }

  return userData;
  // --- FIM DA MODIFICAÇÃO ---
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
    clientEventTime?: number | null; // Adicionado para receber o timestamp do cliente
}

/**
 * Normaliza um evento completo para o formato da CAPI.
 * @param {RawEventInput} rawEvent - Dados brutos do evento com informações geo e do cliente.
 * @returns {ServerEvent | null} Evento normalizado para CAPI ou null se inválido.
 */
export function normalizeEventForCAPI(rawEvent: RawEventInput): ServerEvent | null {
  // Validar nome do evento
  if (!rawEvent.eventName || typeof rawEvent.eventName !== 'string') {
    logger.warn('[NormalizationService] Evento recebido sem nome ou com nome inválido.', { eventName: rawEvent.eventName });
    return null;
  }

  // Normalizar nome do evento
  const facebookEventName = EVENT_NAME_MAPPING[rawEvent.eventName] || rawEvent.eventName; // Usa mapeamento ou nome original

  // Normalizar dados do usuário
  const userData = normalizeUserData(
    rawEvent.userData,
    rawEvent.geoData,
    rawEvent.clientIp,
    rawEvent.userAgent
  );

  // Verificar se temos pelo menos um identificador principal (external_id é o fallback garantido)
  if (!userData.external_id) {
      logger.error('[NormalizationService] Falha crítica: Nenhum external_id (nem original nem fallback) presente após normalização.', { userData: rawEvent.userData });
      // Considerar retornar null aqui pode ser muito restritivo se outros dados de match existirem.
      // Mantendo o fluxo por enquanto, mas é um ponto de atenção.
  }
  // << ADICIONAR VERIFICAÇÃO E LOG PARA EVENTID AUSENTE >>
  if (!rawEvent.eventId) {
    logger.warn(`[NormalizationService] Evento '${rawEvent.eventName}' recebido sem eventId do cliente. Isso pode dificultar a deduplicação no Facebook.`, { sourceUrl: rawEvent.sourceUrl });
  }

  // Normalizar dados customizados
  const customData = normalizeCustomData(rawEvent.customData, rawEvent.eventName);

  // Tempo do evento (Unix timestamp em segundos)
  let eventTimeSource = 'server'; // Para logging
  let finalEventTime: number;
  const currentServerTimeSeconds = Math.floor(Date.now() / 1000);

  if (rawEvent.clientEventTime && typeof rawEvent.clientEventTime === 'number' && rawEvent.clientEventTime > 0) {
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      // Verifica se não é mais antigo que 7 dias E não mais que 2 horas no futuro
      if ((currentServerTimeSeconds - rawEvent.clientEventTime) > sevenDaysInSeconds) {
          logger.warn(`[NormalizationService] clientEventTime (${rawEvent.clientEventTime}) é mais antigo que 7 dias. Usando tempo do servidor. Evento: ${rawEvent.eventName}`, { eventId: rawEvent.eventId });
          finalEventTime = currentServerTimeSeconds;
      } else if (rawEvent.clientEventTime > (currentServerTimeSeconds + (2 * 60 * 60))) { // 2 horas no futuro
          logger.warn(`[NormalizationService] clientEventTime (${rawEvent.clientEventTime}) está mais de 2h no futuro. Usando tempo do servidor. Evento: ${rawEvent.eventName}`, { eventId: rawEvent.eventId });
          finalEventTime = currentServerTimeSeconds;
      } else {
          finalEventTime = rawEvent.clientEventTime;
          eventTimeSource = 'client';
      }
  } else {
      finalEventTime = currentServerTimeSeconds;
      if (rawEvent.clientEventTime) { // Se existia mas era inválido (ex: não número, zero, ou negativo)
          logger.warn(`[NormalizationService] clientEventTime inválido ou não fornecido (${rawEvent.clientEventTime}). Usando tempo do servidor. Evento: ${rawEvent.eventName}`, { eventId: rawEvent.eventId });
      } else {
        // Se não foi fornecido, logar em debug pois é esperado que o fallback para server time ocorra.
        logger.debug(`[NormalizationService] clientEventTime não fornecido. Usando tempo do servidor para evento ${rawEvent.eventName}.`, { eventId: rawEvent.eventId });
      }
  }
  
  logger.debug(`[NormalizationService] Event time para ${rawEvent.eventName} (ID: ${rawEvent.eventId || 'N/A'}) definido por: ${eventTimeSource} (Timestamp: ${finalEventTime})`);

  let finalEventId: string;
  let eventIdSource: string = 'client';

  if (rawEvent.eventId && typeof rawEvent.eventId === 'string' && rawEvent.eventId.trim() !== '') {
      finalEventId = rawEvent.eventId;
  } else {
      const originalEventId = rawEvent.eventId;
      logger.warn(
          `[NormalizationService] Evento '${rawEvent.eventName}' recebido sem eventId válido do cliente ou eventId estava vazio. Gerando novo event_id no servidor. Isso pode dificultar a deduplicação com o Pixel.`, 
          { originalEventId: originalEventId, sourceUrl: rawEvent.sourceUrl }
      );
      finalEventId = generateEventId(); // generateEventId() já existe neste arquivo
      eventIdSource = 'server';
  }
  
  // Atualizar o log de tempo do evento para usar o finalEventId que agora é garantido.
  // Este log pode ser movido para depois da definição de finalEventId se preferir registrar o ID final usado.
  // Por ora, o log anterior de event_time já usava rawEvent.eventId, o que é aceitável para aquele contexto.
  // Adicionando um novo log específico para a fonte do event_id:
  logger.debug(`[NormalizationService] Event ID para ${rawEvent.eventName} definido por: ${eventIdSource} (ID: ${finalEventId})`);

  const serverEvent: ServerEvent = {
    event_name: facebookEventName,
    event_time: finalEventTime,
    event_id: finalEventId, // Usar o finalEventId garantido
    event_source_url: rawEvent.sourceUrl || null,
    opt_out: false, // Assumindo que não há opt-out por padrão
    action_source: rawEvent.isAppEvent ? 'app' : 'website', // Ou 'physical_store', 'chat', etc. conforme necessário
    user_data: userData,
    custom_data: customData,
    // Adicionar Data Processing Options se presentes e válidos
    ...(rawEvent.dataProcessingOptions && rawEvent.dataProcessingOptions.length > 0 && {
        data_processing_options: rawEvent.dataProcessingOptions,
        data_processing_options_country: rawEvent.dataProcessingOptionsCountry || 0,
        data_processing_options_state: rawEvent.dataProcessingOptionsState || 0,
    }),
  };

  // Remover chaves com valor null ou undefined do objeto final (exceto campos permitidos como null pela CAPI se houver)
  Object.keys(serverEvent).forEach(key => {
    const K = key as keyof ServerEvent;
    if (serverEvent[K] === undefined) { // Manter null onde for permitido/necessário (ex: event_id)
      delete serverEvent[K];
    }
  });
    Object.keys(serverEvent.user_data).forEach(key => {
        const K = key as keyof typeof serverEvent.user_data;
        if (serverEvent.user_data[K] === null || serverEvent.user_data[K] === undefined) {
            delete serverEvent.user_data[K];
        }
    });
    Object.keys(serverEvent.custom_data).forEach(key => {
        const K = key as keyof typeof serverEvent.custom_data;
        if (serverEvent.custom_data[K] === null || serverEvent.custom_data[K] === undefined) {
            delete serverEvent.custom_data[K];
        }
    });


  return serverEvent;
} 