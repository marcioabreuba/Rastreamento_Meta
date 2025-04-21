import { Request, Response } from 'express';
import * as GeoIPService from '../Core/GeoIPService';
import * as NormalizationService from '../Core/NormalizationService';
import { RawEventInput } from '../Core/NormalizationService';
import logger from '../../utils/logger'; // Ajustar caminho
import config from '../../config'; // <--- Adicionar esta linha
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
// Importar CapiService
// import { sendEvent as sendEventToCapi } from './CapiService'; // <<< Tentativa anterior
import { sendEvent as sendEventToCapi } from './CapiService'; // <<< Usar import direto com alias
// <<< ADICIONAR IMPORTAÇÕES DE TIPOS WEB >>>
import { WebUserData, WebCustomData } from '../Model/WebEventParams';

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
 * Processa uma requisição de rastreamento recebida na rota /track.
 */
export const handleTrackRequest = async (req: Request, res: Response): Promise<void> => {
  const requestStartTime = Date.now();
  const { eventName, userData, customData, eventId, sourceUrl, referrer, ...rest } = req.body;

  /* LOG FBC REMOVIDO
  // +++ LOG FBC TEMPORÁRIO +++
  if (userData) {
    logger.info(`[FBC DEBUG] TrackController - Received userData.fbc: ${userData.fbc}`);
  } else {
    logger.info(`[FBC DEBUG] TrackController - Received userData is null/undefined.`);
  }
  // +++ FIM LOG FBC +++
  */

  // Loga os dados brutos recebidos APENAS se LOG_LEVEL=debug
  logger.debug(`[TrackController] Raw event received: ${eventName}`, {
      receivedEventName: eventName,
      receivedEventId: eventId, // Event ID gerado pelo frontend (se houver)
      receivedSourceUrl: sourceUrl,
      receivedReferrer: referrer,
      receivedUserData: userData, // Dados do usuário COMO CHEGARAM
      receivedCustomData: customData, // Dados customizados COMO CHEGARAM
      receivedOtherParams: rest // Outros parâmetros no body
  });

  if (!eventName) {
    logger.warn('[TrackController] Requisição recebida sem eventName.', { body: req.body });
    res.status(400).json({ success: false, error: 'Event name is required' });
    return;
  }

  try {
    // 1. Obter Dados da Requisição (IP, UserAgent)
    const ipHeader = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const clientIp = typeof ipHeader === 'string' ? ipHeader.split(',')[0].trim() : null;
    const userAgent = req.headers['user-agent'] || null;

    logger.debug(`[TrackController] Recebido evento: ${eventName}`, { ip: clientIp, ua: userAgent?.substring(0, 50) });

    // 2. Obter Dados GeoIP
    const geoData = GeoIPService.getGeoData(clientIp);
    if (geoData) {
        logger.debug(`[TrackController] GeoIP encontrado para ${clientIp}: ${geoData.city}, ${geoData.region?.code}, ${geoData.country?.code}`);
    }

    // 3. Selecionar e Executar Handler Específico do Evento
    const handler = eventHandlers[eventName] || handleGenericEvent;
    const specificEventData = handler(userData, customData, eventName);

    // 4. Preparar Input para Normalização
    const rawEventInput: RawEventInput = {
      eventName,
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
    };

    // 5. Normalizar Evento para CAPI
    const capiEvent = NormalizationService.normalizeEventForCAPI(rawEventInput);

    // Responder ao cliente imediatamente se a normalização for bem-sucedida
    // e iniciar o envio para a CAPI de forma assíncrona.
    if (capiEvent) {
        // ++ Log Detalhado Similando Pixel Helper (Backend) ++
        try {
            // Função auxiliar para formatar objetos para log (evita [Object object])
            const formatObjectForLog = (obj: any): string => {
                if (!obj || Object.keys(obj).length === 0) return ' (None)';
                let logString = '';
                for (const key in obj) {
                    // Não logar user agent completo nos logs do Render
                     const valueToLog = (key === 'client_user_agent' && obj[key]) ? String(obj[key]).substring(0, 70) + '...' : obj[key];
                     if (valueToLog !== null && valueToLog !== undefined) { // Logar apenas chaves com valor
                         logString += `\n        ${key}: ${valueToLog}`;
                     }
                }
                return logString || ' (None)';
            };

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
        // ++ Fim do Log Detalhado ++

        // Enviar para CAPI de forma assíncrona
        sendEventToCapi(capiEvent).catch(error => {
          logger.error(`[TrackController] Erro assíncrono ao enviar evento ${capiEvent.event_id} para CAPI: ${error.message}`, { error });
        });

        // Responder imediatamente ao cliente (sucesso na recepção e início do processamento)
        const processingTime = Date.now() - requestStartTime;
        logger.info(`[TrackController] Resposta 200 enviada para ${eventName} (ID: ${capiEvent.event_id}). Tempo: ${processingTime}ms`);
        res.status(200).json({ success: true, eventId: capiEvent.event_id });

    } else {
      logger.error(`[TrackController] Falha ao normalizar evento ${eventName}. Evento descartado.`, { rawInput: rawEventInput });
      res.status(400).json({ success: false, error: 'Failed to normalize event data. Check required parameters.' });
    }

  } catch (error: any) {
    const processingTime = Date.now() - requestStartTime;
    logger.error(`[TrackController] Erro inesperado ao processar evento ${eventName}: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      body: req.body,
      processingTime
    });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}; 