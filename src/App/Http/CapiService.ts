import axios from 'axios';
import { ServerEvent } from '../Model/ServerEventParams';
import config from '../../config'; // Ajustar caminho para config
import logger from '../../utils/logger'; // Ajustar caminho para logger

// Construir URL base da CAPI (usar a versão mais recente ou a especificada em config)
const CAPI_VERSION = config.fbApiVersion || 'v19.0'; // Exemplo: v19.0
const CAPI_URL = `https://graph.facebook.com/${CAPI_VERSION}/${config.fbPixelId}/events`;

/**
 * Envia um evento normalizado para a API de Conversões do Meta.
 * @param {ServerEvent} event - O objeto do evento formatado para CAPI.
 */
export async function sendEvent(event: ServerEvent): Promise<void> {
  if (!config.fbAccessToken || !config.fbPixelId) {
    logger.error('[CapiService] Pixel ID ou Access Token não configurados. Evento não enviado.', { eventId: event.event_id });
    return; // Não pode enviar sem credenciais
  }

  const payload = {
    data: [event],
    // test_event_code: config.fbTestEventCode || undefined // Descomentar para enviar eventos de teste
  };

  const params = {
    access_token: config.fbAccessToken,
  };

  try {
    logger.debug(`[CapiService] Enviando evento ${event.event_name} (ID: ${event.event_id}) para CAPI...`, {
      url: CAPI_URL,
      // Não logar o payload completo em produção devido a PII (mesmo hasheado)
      // apenas alguns campos não sensíveis para rastreamento
      eventName: event.event_name,
      eventId: event.event_id,
      actionSource: event.action_source,
      eventTime: event.event_time
    });

    const response = await axios.post(CAPI_URL, payload, { params });

    logger.info(`[CapiService] Evento ${event.event_name} (ID: ${event.event_id}) enviado com sucesso para CAPI.`, {
        status: response.status,
        fbTraceId: response.data?.trace_id // ID de rastreamento do Facebook
    });

    // Log detalhado da resposta em modo de debug
    if (config.nodeEnv === 'development') {
        logger.debug('[CapiService] Resposta da CAPI:', { responseData: response.data });
    }

  } catch (error: any) {
    let errorMessage = error.message;
    let errorDetails = {};

    if (axios.isAxiosError(error) && error.response) {
      // Erro específico da API do Facebook
      errorMessage = `Erro da API do Facebook (${error.response.status}): ${JSON.stringify(error.response.data)}`;
      errorDetails = {
          status: error.response.status,
          responseData: error.response.data,
          eventId: event.event_id
      };
      logger.error(`[CapiService] Falha ao enviar evento ${event.event_name} (ID: ${event.event_id}) para CAPI: ${errorMessage}`, errorDetails);
    } else {
      // Outro erro (rede, etc.)
      logger.error(`[CapiService] Erro inesperado ao enviar evento ${event.event_name} (ID: ${event.event_id}) para CAPI: ${errorMessage}`, {
          eventId: event.event_id,
          error: error
      });
    }
    // Poderia implementar retentativas aqui para certos tipos de erro

    // Re-throw o erro se precisar ser tratado em outro lugar (embora o controller já trate com catch)
    // throw error;
  }
} 