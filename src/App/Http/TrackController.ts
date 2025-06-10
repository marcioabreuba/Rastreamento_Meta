import { Request, Response } from 'express';
import * as GeoIPService from '../Core/GeoIPService';
import * as NormalizationService from '../Core/NormalizationService';
import { RawEventInput } from '../Core/NormalizationService';
import logger from '../../utils/logger';
import config from '../../config';
// Importar todos os handlers de evento
import { handlePurchase } from '../events/PurchaseHandler';
import { handleViewContent } from '../events/ViewContentHandler';
import { handleAddToCart } from '../events/AddToCartHandler';
import { handleInitiateCheckout } from '../events/InitiateCheckoutHandler';
import { handleSearch } from '../events/SearchHandler';
import { handleLead } from '../events/LeadHandler';
import { handleCompleteRegistration } from '../events/CompleteRegistrationHandler';
import { handleAddPaymentInfo } from '../events/AddPaymentInfoHandler';
import { handleAddToWishlist } from '../events/AddToWishlistHandler';
import { handleGenericEvent } from '../events/GenericEventHandler';
import { sendEvent as sendEventToCapi, CapiSendResult } from './CapiService';
import { WebUserData, WebCustomData } from '../Model/WebEventParams';
import { isValidEmail, isValidBrazilianPhone, isPrivateIP } from '../../utils/validators';

// Definir um tipo para a assinatura da função do handler
type EventHandlerFunction = (rawUserData: any, rawCustomData: any, originalEventName?: string) => { userData: Partial<WebUserData>; customData: Partial<WebCustomData> };

// Usar o tipo definido para o Record
const eventHandlers: Record<string, EventHandlerFunction> = {
  'Purchase': handlePurchase,
  'ViewContent': handleViewContent,
  'AddToCart': handleAddToCart,
  'InitiateCheckout': handleInitiateCheckout,
  'Search': handleSearch,
  'Lead': handleLead,
  'CompleteRegistration': handleCompleteRegistration,
  'AddPaymentInfo': handleAddPaymentInfo,
  'AddToWishlist': handleAddToWishlist,
  // Adicionar outros eventos específicos mapeados no NormalizationService se tiverem handlers próprios
  'ViewHome': handleGenericEvent, // Usando genérico como exemplo
  'ViewList': handleGenericEvent,
  'ViewCart': handleGenericEvent,
  'ViewCategory': handleGenericEvent,
  'PageView': handleGenericEvent,
  // ... outros eventos usam o genérico por padrão
};

/**
 * Extrai dados da requisição HTTP (IP e User Agent)
 * @param req - Objeto de requisição Express
 * @returns Objeto com clientIp e userAgent extraídos
 */
const extractRequestData = (req: Request) => {
  const ipHeader = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
  const clientIp = typeof ipHeader === 'string' ? ipHeader.split(',')[0].trim() : null;
  const userAgent = req.headers['user-agent'] || null;
  
  return { clientIp, userAgent };
};

/**
 * Formata objetos para log evitando [Object object]
 * @param obj - Objeto a ser formatado
 * @returns String formatada para logging
 */
const formatObjectForLog = (obj: any): string => {
  if (!obj || Object.keys(obj).length === 0) return ' (None)';
  let logString = '';
  for (const key in obj) {
    // Não logar user agent completo nos logs do Render
    let valueToLog: any;
    if (key === 'client_user_agent' && obj[key]) {
      valueToLog = String(obj[key]).substring(0, config.validation.debugLogLength) + '...';
    } else if (Array.isArray(obj[key])) {
      // Formatação especial para arrays (como content_ids)
      valueToLog = JSON.stringify(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Formatação especial para objetos
      valueToLog = JSON.stringify(obj[key]);
    } else {
      valueToLog = obj[key];
    }
    
    if (valueToLog !== null && valueToLog !== undefined) { // Logar apenas chaves com valor
      logString += `\n        ${key}: ${valueToLog}`;
    }
  }
  return logString || ' (None)';
};

/**
 * Loga detalhes do evento CAPI preparado
 */
const logCapiEventDetails = (capiEvent: any) => {
  try {
    logger.debug(`[TrackController] Prepared CAPI Event (Pixel Helper Server):
      Event Name: ${capiEvent.event_name}
      Pixel ID: ${config.fbPixelId}
      Event ID: ${capiEvent.event_id}
      --- Custom Parameters ---${formatObjectForLog(capiEvent.custom_data)}
      --- User Data (Advanced Matching) ---${formatObjectForLog(capiEvent.user_data)}
      --- Event Info ---
        Event Time: ${capiEvent.event_time}
        Action Source: ${capiEvent.action_source}
        Source URL: ${capiEvent.event_source_url ?? '(Not provided)'}
        Data Processing Options: ${capiEvent.data_processing_options?.join(', ') || '[]'}`);
  } catch (logError: any) {
    logger.error(`[TrackController] Error generating detailed debug log: ${logError.message}`);
  }
};

/**
 * Valida dados básicos do evento e userData
 * @param eventName - Nome do evento a ser validado
 * @param body - Corpo da requisição para validação adicional
 * @returns Objeto com isValid e error (se houver)
 */
const validateEventData = (eventName: string, body: any) => {
  if (!eventName) {
    return { isValid: false, error: 'Event name is required' };
  }
  
  // Validar formato de email se fornecido
  if (body.userData?.email && !isValidEmail(body.userData.email)) {
    logger.warn(`[TrackController] Email inválido recebido: ${body.userData.email}`);
    // Não bloquear o evento, apenas alertar
  }
  
  // Validar formato de telefone brasileiro se fornecido
  if (body.userData?.phone && !isValidBrazilianPhone(body.userData.phone)) {
    logger.warn(`[TrackController] Telefone brasileiro inválido recebido: ${body.userData.phone}`);
    // Não bloquear o evento, apenas alertar
  }
  
  return { isValid: true, error: null };
};

/**
 * Cria resposta de erro padronizada para o cliente
 * @param message - Mensagem de erro
 * @param details - Detalhes adicionais do erro (opcional)
 * @returns Objeto de resposta de erro padronizado
 */
const createErrorResponse = (eventId: string | null, capiError: string, message: string) => {
  return {
    success: false,
    serverEventId: eventId,
    capiPayload: null,
    capiSendStatus: 'error',
    capiTraceId: null,
    capiError,
    message
  };
};

/**
 * Processa uma requisição de rastreamento recebida na rota /track.
 */
export const handleTrackRequest = async (req: Request, res: Response): Promise<void> => {
  const requestStartTime = Date.now();
  const { eventName, originalEventName, userData, customData, eventId, sourceUrl, referrer, client_event_time, ...rest } = req.body;

  // Loga os dados brutos recebidos APENAS se LOG_LEVEL=debug
  logger.debug(`[TrackController] Raw event received: ${eventName}`, {
      receivedEventName: eventName,
      receivedOriginalEventName: originalEventName,
      receivedEventId: eventId,
      receivedSourceUrl: sourceUrl,
      receivedReferrer: referrer,
      receivedUserData: userData,
      receivedCustomData: customData,
      receivedOtherParams: rest
  });

  // ✅ CORREÇÃO: Usar originalEventName se disponível, senão eventName
  // Isso garante que eventos como Timer_1min, Scroll_25 sejam processados com o nome original
  // para manter consistência entre CAPI e Pixel
  const effectiveEventName = originalEventName || eventName;
  
  // Log da correção aplicada
  if (originalEventName && originalEventName !== eventName) {
    logger.debug(`[TrackController] 🔧 Usando originalEventName para CAPI: "${originalEventName}" (frontend enviou "${eventName}" mapeado)`);
  }

  // Validar dados básicos usando o nome efetivo
  const validation = validateEventData(effectiveEventName, req.body);
  if (!validation.isValid) {
    logger.warn('[TrackController] Requisição recebida sem eventName.', { body: req.body });
    res.status(400).json({ success: false, error: validation.error });
    return;
  }

  try {
    // 1. Extrair dados da requisição
    const { clientIp, userAgent } = extractRequestData(req);
    logger.debug(`[TrackController] Recebido evento: ${effectiveEventName}`, { ip: clientIp, ua: userAgent?.substring(0, config.validation.userAgentLogLength) });

    // 2. Obter Dados GeoIP
    let geoData = null;
    if (!isPrivateIP(clientIp)) {
      geoData = GeoIPService.getGeoData(clientIp);
    if (geoData) {
        logger.debug(`[TrackController] GeoIP encontrado para ${clientIp}: ${geoData.city}, ${geoData.region?.code}, ${geoData.country?.code}`);
      }
    } else {
      logger.debug(`[TrackController] IP privado/local detectado (${clientIp}), pulando GeoIP`);
    }

    // 3. Selecionar e Executar Handler Específico do Evento - usando o nome efetivo
    const handler = eventHandlers[effectiveEventName] || handleGenericEvent;
    const specificEventData = handler(userData, customData, effectiveEventName);

    // 4. Preparar Input para Normalização - usando o nome efetivo
    const rawEventInput: RawEventInput = {
      eventName: effectiveEventName, // ✅ CORREÇÃO: usar nome efetivo (original quando disponível)
      eventId: eventId || null,
      sourceUrl: sourceUrl || customData?.sourceUrl || null,
      referrer: referrer || customData?.referrer || null,
      clientIp,
      userAgent,
      userData: { ...(userData || {}), ...(specificEventData.userData || {}) }, // Mescla dados gerais e específicos
      customData: { ...(customData || {}), ...(specificEventData.customData || {}) }, // Mescla dados gerais e específicos
      geoData,
      // Passar outros campos relevantes do body se necessário (ex: dataProcessingOptions)
      dataProcessingOptions: rest.dataProcessingOptions,
      dataProcessingOptionsCountry: rest.dataProcessingOptionsCountry,
      dataProcessingOptionsState: rest.dataProcessingOptionsState,
      clientEventTime: client_event_time ? Number(client_event_time) : null
    };

    // Logs de alerta para identificadores ausentes
    if (!rawEventInput.userData?.external_id) {
      logger.warn(`[TrackController] Evento recebido sem external_id! eventName=${effectiveEventName}, eventId=${rawEventInput.eventId || 'N/A'}, userAgent=${userAgent?.substring(0, config.validation.userAgentLogLength)}`);
    }
    if (!rawEventInput.userData?.fbp) {
      // ✅ Verificar se é Facebook In-App Browser (FB_IAB) - onde FBP não está disponível
      if (userAgent?.includes('FB_IAB')) {
        logger.debug(`[TrackController] 📱 FBP ausente em FB In-App Browser (esperado) - eventName=${effectiveEventName}, eventId=${rawEventInput.eventId || 'N/A'}, fbc=${rawEventInput.userData?.fbc ? 'presente' : 'ausente'}`);
      } else {
        logger.warn(`[TrackController] Evento recebido sem _fbp! eventName=${effectiveEventName}, eventId=${rawEventInput.eventId || 'N/A'}, userAgent=${userAgent?.substring(0, config.validation.userAgentLogLength)}`);
      }
    }

    // 5. Normalizar Evento para CAPI
    const capiEvent = NormalizationService.normalizeEventForCAPI(rawEventInput);

    // Processar evento normalizado
    if (capiEvent) {
        // Log detalhado do evento CAPI preparado
        logCapiEventDetails(capiEvent);

        // Enviar para CAPI e aguardar resultado 
        let capiResult: CapiSendResult = { status: 'skipped', error: 'Send not attempted' };
        try {
            capiResult = await sendEventToCapi(capiEvent);
            logger.info(`[TrackController] Resultado do envio CAPI para ${capiEvent.event_id}: ${capiResult.status}`, { traceId: capiResult.traceId });
        } catch (capiError: any) {
             logger.error(`[TrackController] Erro síncrono ao enviar evento ${capiEvent.event_id} para CAPI: ${capiError.message}`, { error: capiError });
             capiResult = { status: 'error', error: capiError.message };
        }

        // Montar e enviar a nova resposta JSON 
        const processingTime = Date.now() - requestStartTime;
        const responsePayload = {
            success: true,
            serverEventId: capiEvent.event_id,
            capiPayload: capiEvent,
            capiSendStatus: capiResult.status,
            capiTraceId: capiResult.traceId || null,
            capiError: capiResult.error || null,
            message: `Evento ${effectiveEventName} processado. Status CAPI: ${capiResult.status}.`,
            processingTimeMs: processingTime
        };

        logger.info(`[TrackController] Resposta 200 (com detalhes CAPI) enviada para ${effectiveEventName} (ID: ${capiEvent.event_id}). Tempo: ${processingTime}ms`);
        res.status(200).json(responsePayload);

    } else {
      logger.error(`[TrackController] Falha ao normalizar evento ${effectiveEventName}. Evento descartado.`, { rawInput: rawEventInput });
      const errorResponse = createErrorResponse(
        eventId || null,
        'Failed to normalize event data. Check required parameters.',
        `Falha ao normalizar evento ${effectiveEventName}.`
      );
      errorResponse.capiSendStatus = 'skipped';
      res.status(400).json(errorResponse);
    }

  } catch (error: any) {
    const processingTime = Date.now() - requestStartTime;
    logger.error(`[TrackController] Erro inesperado ao processar evento ${effectiveEventName}: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      body: req.body,
      processingTime
    });
    const errorResponse = createErrorResponse(
      eventId || null,
      'Internal server error during processing.',
      `Erro interno no servidor ao processar ${effectiveEventName}.`
    );
    res.status(500).json(errorResponse);
  }
}; 