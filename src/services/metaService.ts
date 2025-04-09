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
    
    // Obter o nome do evento (usar nome original para eventos personalizados)
    const eventNameToSend = EVENT_MAPPING[eventName] || eventName;
    
    // Definir interfaces para os objetos simplificados
    interface SimplifiedUserData {
      client_ip_address?: string;
      client_user_agent?: string;
      external_id?: string;
      fbp?: string;
      fbc?: string;
      em?: string;
      ph?: string;
      fn?: string;
      ln?: string;
      country?: string;
      ct?: string;
      st?: string;
      zp?: string;
      [key: string]: any;
    }
    
    interface SimplifiedCustomData {
      currency: string;
      value: number;
      content_ids?: string[];
      content_name?: string;
      content_type?: string;
      content_category?: string;
      search_string?: string;
      [key: string]: any;
    }
    
    // Extrair apenas os campos de usuário essenciais e suportados
    const userData_simplified: SimplifiedUserData = {
      client_ip_address: userData.client_ip_address,
      client_user_agent: userData.client_user_agent,
      external_id: userData.external_id,
      fbp: userData.fbp,
      fbc: userData.fbc,
      em: userData.em,
      ph: userData.ph,
      fn: userData.fn,
      ln: userData.ln,
      country: userData.country,
      ct: userData.city,
      st: userData.state,
      zp: userData.zip
    };
    
    // Extrair apenas os campos personalizados essenciais
    const customData_simplified: SimplifiedCustomData = {
      currency: customData.currency || 'BRL',
      value: customData.value || 0
    };
    
    // Adicionar content_ids se disponíveis
    if (customData.content_ids) {
      customData_simplified.content_ids = Array.isArray(customData.content_ids) 
        ? customData.content_ids 
        : [customData.content_ids];
    }
    
    // Adicionar content_name se disponível
    if (customData.content_name) {
      customData_simplified.content_name = customData.content_name;
    }
    
    // Adicionar content_type se disponível
    if (customData.content_type) {
      customData_simplified.content_type = customData.content_type;
    }
    
    // Adicionar content_category se disponível
    if (customData.content_category) {
      customData_simplified.content_category = Array.isArray(customData.content_category)
        ? customData.content_category.join(',')
        : customData.content_category;
    }
    
    // Adicionar search_string apenas para eventos de pesquisa
    if ((eventName === 'Search' || eventName === 'ViewSearchResults') && customData.search_string) {
      customData_simplified.search_string = customData.search_string;
    }
    
    // Interface para o payload do evento
    interface EventPayload {
      event_name: string;
      event_time: number;
      event_source_url: string;
      event_id: string;
      action_source: string;
      user_data: Record<string, any>;
      custom_data: Record<string, any>;
    }
    
    // Criar payload simplificado
    const eventPayload: EventPayload = {
      event_name: eventNameToSend,
      event_time: serverData.event_time,
      event_source_url: serverData.event_source_url,
      event_id: serverData.event_id,
      action_source: serverData.action_source,
      user_data: userData_simplified,
      custom_data: customData_simplified
    };
    
    // Remover campos nulos ou indefinidos do user_data
    eventPayload.user_data = Object.fromEntries(
      Object.entries(eventPayload.user_data)
        .filter(([_, value]) => value !== null && value !== undefined)
    );
    
    // Preparar os dados completos para envio
    const requestData = {
      data: [eventPayload],
      access_token: config.fbAccessToken,
      test_event_code: config.nodeEnv === 'development' ? config.fbTestEventCode || 'TEST12345' : undefined
    };
    
    // Log formatado
    const eventTime = new Date(serverData.event_time * 1000).toISOString();
    logger.debug(`Enviando evento para Conversions API: ${eventName} (Nome: ${eventNameToSend})`);
    logger.debug(`Payload: ${JSON.stringify(requestData, null, 2)}`);
    
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
    
    // Para debug, vamos registrar a resposta completa
    const responseText = await response.text();
    logger.debug(`Resposta da API: ${responseText}`);
    
    if (!response.ok) {
      logger.error(`Erro ao enviar evento para Conversions API: ${response.status} ${response.statusText}`, {
        eventName,
        eventId: serverData.event_id,
        error: responseText,
        requestData: JSON.stringify(requestData)
      });
      return false;
    }
    
    const result = JSON.parse(responseText);
    
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