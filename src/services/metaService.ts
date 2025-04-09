/**
 * Serviço para enviar eventos para o Meta (Facebook Pixel e Conversions API)
 */

import fetch from 'node-fetch';
import { NormalizedEvent } from '../types';
import config from '../config';
import logger from '../utils/logger';
import { EVENT_MAPPING, validateFbp } from '../utils/eventUtils';

/**
 * Gera o código do pixel para um evento
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {string} Código HTML do pixel
 */
export const generatePixelCode = (event: NormalizedEvent): string => {
  const { eventName, userData, customData, serverData } = event;
  
  // Obter o nome do evento para o Facebook Pixel (mapeado)
  const fbPixelEventName = EVENT_MAPPING[eventName] || eventName;
  
  // Código base do pixel
  let pixelCode = `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${config.fbPixelId}');
`;

  // Adicionar evento específico
  pixelCode += `fbq('track', '${fbPixelEventName}'`;
  
  // Adicionar dados personalizados se existirem
  if (Object.values(customData).some(val => val !== null)) {
    const cleanCustomData: Record<string, any> = {};
    Object.entries(customData).forEach(([key, value]) => {
      if (value !== null) {
        // Converter chaves para o formato do pixel (snake_case para camelCase)
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        cleanCustomData[camelKey] = value;
      }
    });
    pixelCode += `, ${JSON.stringify(cleanCustomData)}`;
  }
  
  // Adicionar dados do evento
  pixelCode += `, {
    eventID: '${serverData.event_id}'
  }`;
  
  pixelCode += `);
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${config.fbPixelId}&ev=${fbPixelEventName}&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;

  return pixelCode;
};

/**
 * Envia evento para a Conversions API do Facebook
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<boolean>} Indica se o envio foi bem-sucedido
 */
export const sendToConversionsAPI = async (event: NormalizedEvent): Promise<boolean> => {
  try {
    const { eventName, userData, customData, serverData } = event;
    
    // Verificar se temos os tokens necessários
    if (!config.fbAccessToken) {
      logger.error('Token de acesso do Facebook não configurado. Evento não enviado para Conversions API.');
      return false;
    }
    
    // Construir a URL para o endpoint da API
    const apiUrl = `https://graph.facebook.com/v16.0/${config.fbPixelId}/events`;
    
    // Definir o tipo para o payload do evento para evitar erros de linter
    interface EventPayload {
      event_name: string;
      event_time: number;
      event_source_url: string;
      event_id: string;
      action_source: string;
      user_data: Record<string, string | null>;
      custom_data: Record<string, any>;
      data_processing_options?: string[];
      data_processing_options_country?: number | null;
      data_processing_options_state?: number | null;
      referrer_url?: string | null;
      customer_segmentation?: any;
    }
    
    // Obter o nome mapeado do evento, mas usar o nome original para eventos personalizados
    // Com base no projeto de referência, usamos os nomes originais como Scroll_90, não CustomEvent
    const eventNameToSend = EVENT_MAPPING[eventName] || eventName;
    
    // Construir o payload do evento
    const eventPayload: EventPayload = {
      event_name: eventNameToSend,
      event_time: serverData.event_time,
      event_source_url: serverData.event_source_url,
      event_id: serverData.event_id,
      action_source: serverData.action_source,
      user_data: {
        client_ip_address: userData.client_ip_address,
        client_user_agent: userData.client_user_agent,
        external_id: userData.external_id,
        fbp: userData.fbp,
        fbc: userData.fbc,
        em: userData.em,
        ph: userData.ph,
        fn: userData.fn,
        ln: userData.ln,
        ge: userData.ge,
        db: userData.db,
        country: userData.country,
        ct: userData.city,
        st: userData.state,
        zp: userData.zip,
        // Outros parâmetros
        subscription_id: userData.subscription_id,
        fb_login_id: userData.fb_login_id,
        lead_id: userData.lead_id,
        ctwa_clid: userData.ctwa_clid,
        ig_account_id: userData.ig_account_id,
        ig_sid: userData.ig_sid,
        page_id: userData.page_id,
        page_scoped_user_id: userData.page_scoped_user_id,
        // Parâmetros específicos de app
        anon_id: userData.anon_id,
        madid: userData.madid,
        vendor_id: userData.vendor_id
      },
      custom_data: {
        currency: customData.currency,
        value: customData.value,
        // Processar arrays corretamente para a API
        content_category: Array.isArray(customData.content_category) 
          ? customData.content_category.join(',') 
          : customData.content_category,
        content_ids: Array.isArray(customData.content_ids) 
          ? customData.content_ids 
          : customData.content_ids ? [customData.content_ids] : undefined,
        content_name: customData.content_name,
        content_type: customData.content_type,
        order_id: customData.order_id,
        contents: customData.contents,
        status: customData.status,
        // Incluir os campos específicos do evento somente quando relevantes
        ...(eventName === 'Search' || eventName === 'ViewSearchResults' 
            ? { search_string: customData.search_string } 
            : {}),
        ...(eventName.includes('Video') 
            ? { 
                video_position: customData.video_position,
                video_duration: customData.video_duration,
                video_title: customData.video_title
              } 
            : {})
      }
    };
    
    // Remover campos indefinidos ou nulos
    eventPayload.user_data = Object.fromEntries(
      Object.entries(eventPayload.user_data)
        .filter(([_, value]) => value !== null && value !== undefined)
    ) as Record<string, string>;
    
    eventPayload.custom_data = Object.fromEntries(
      Object.entries(eventPayload.custom_data)
        .filter(([_, value]) => value !== null && value !== undefined)
    );
    
    // Adicionar opções de processamento de dados (para conformidade com LGPD, CCPA, etc.)
    if (serverData.data_processing_options && serverData.data_processing_options.length > 0) {
      eventPayload.data_processing_options = serverData.data_processing_options;
      
      if (serverData.data_processing_options_country !== null) {
        eventPayload.data_processing_options_country = serverData.data_processing_options_country;
      }
      
      if (serverData.data_processing_options_state !== null) {
        eventPayload.data_processing_options_state = serverData.data_processing_options_state;
      }
    }
    
    // Adicionar URL de referência se disponível
    if (serverData.referrer_url) {
      eventPayload.referrer_url = serverData.referrer_url;
    }
    
    // Adicionar segmentação de cliente se disponível
    if (serverData.customer_segmentation) {
      eventPayload.customer_segmentation = serverData.customer_segmentation;
    }
    
    // Preparar os dados completos para envio
    const requestData = {
      data: [eventPayload],
      access_token: config.fbAccessToken,
      test_event_code: config.nodeEnv === 'development' ? config.fbTestEventCode || 'TEST12345' : undefined
    };
    
    // Log formatado similar ao Pixel Helper para debug
    const eventTime = new Date(serverData.event_time * 1000).toISOString();
    logger.debug(`Enviando evento para Conversions API: ${eventName} (Nome mapeado: ${eventNameToSend})`);
    
    console.log('\n');
    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log(`│ 🔵 META PIXEL EVENTO RASTREADO: ${eventName.padEnd(28)} │`);
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log(`│ 📆 Data/Hora: ${eventTime.padEnd(42)} │`);
    console.log(`│ 🔑 Evento ID: ${serverData.event_id.padEnd(42)} │`);
    console.log(`│ 🌐 URL: ${(serverData.event_source_url || '').substring(0, 42).padEnd(42)} │`);
    console.log(`│ 📝 Nome evento API: ${eventNameToSend.padEnd(42)} │`);
    console.log('└──────────────────────────────────────────────────────────┘');
    
    // Enviar para a API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Erro ao enviar evento para Conversions API: ${response.status} ${response.statusText}`, {
        eventName,
        eventId: serverData.event_id,
        error: errorText,
        requestData: JSON.stringify(requestData)
      });
      return false;
    }
    
    const result = await response.json();
    
    if (result.events_received && result.events_received > 0) {
      logger.info(`Evento enviado com sucesso para Conversions API: ${eventName}`, {
        eventName,
        eventId: serverData.event_id,
        response: result
      });
      return true;
    } else {
      logger.warn(`Evento processado, mas nenhum evento recebido: ${eventName}`, {
        eventName,
        eventId: serverData.event_id,
        response: result
      });
      return false;
    }
  } catch (error: any) {
    logger.error(`Erro ao enviar evento para Conversions API: ${error.message}`, {
      eventName: event.eventName,
      eventId: event.serverData.event_id,
      error: error.message
    });
    return false;
  }
}; 