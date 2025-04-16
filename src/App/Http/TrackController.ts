import { Request, Response } from 'express';
import * as GeoIPService from '../Core/GeoIPService';
import * as NormalizationService from '../Core/NormalizationService';
import { RawEventInput } from '../Core/NormalizationService';
import logger from '../../utils/logger'; // Ajustar caminho
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
// Importar CapiService (a ser criado)
import * as CapiService from './CapiService'; // Ajustar nome/caminho se necessário

// Mapeamento de eventName para a função handler correspondente
const eventHandlers: Record<string, Function> = {
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

  if (!eventName) {
    logger.warn('[TrackController] Requisição recebida sem eventName.', { body: req.body });
    res.status(400).json({ success: false, error: 'Event name is required' });
    return;
  }

  try {
    // 1. Obter Dados da Requisição (IP, UserAgent)
    // Prioriza X-Forwarded-For se disponível (comum em proxies/load balancers)
    const ipHeader = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    // Pega o primeiro IP se houver múltiplos em X-Forwarded-For
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
    const specificEventData = handler(userData, customData);

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
    const serverEvent = NormalizationService.normalizeEventForCAPI(rawEventInput);

    // 6. Enviar para CAPI (se válido)
    if (serverEvent) {
      logger.info(`[TrackController] Evento ${serverEvent.event_name} normalizado. Enviando para CAPI...`, {
          eventId: serverEvent.event_id,
          actionSource: serverEvent.action_source
      });

      // Chamar CapiService de forma assíncrona (não esperar pela resposta da Meta)
      CapiService.sendEvent(serverEvent).catch(error => {
          logger.error(`[TrackController] Erro assíncrono ao enviar evento ${serverEvent.event_id} para CAPI: ${error.message}`, { error });
      });

      // Responder imediatamente ao cliente (sucesso na recepção e início do processamento)
      const processingTime = Date.now() - requestStartTime;
      logger.info(`[TrackController] Resposta 200 enviada para ${eventName} (ID: ${serverEvent.event_id}). Tempo: ${processingTime}ms`);
      res.status(200).json({ success: true, eventId: serverEvent.event_id });

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