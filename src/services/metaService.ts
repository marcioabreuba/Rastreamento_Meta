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
    
    // ======= ABORDAGEM ULTRA SIMPLIFICADA =======
    // Criar um payload mínimo com apenas os campos obrigatórios absolutos
    // para testar se o problema é com o formato do payload
    
    // Usar os campos básicos que a API requer
    const eventPayload = {
      event_name: eventNameToSend,
      event_time: Math.floor(Date.now() / 1000),
      event_id: serverData.event_id,
      action_source: "website",
      user_data: {
        client_ip_address: userData.client_ip_address || "127.0.0.1",
        client_user_agent: userData.client_user_agent || "",
        external_id: userData.external_id || `user_${Date.now()}`
      },
      custom_data: {
        currency: "BRL",
        value: 0
      }
    };
    
    // Preparar os dados completos para envio
    const requestData = {
      data: [eventPayload],
      access_token: config.fbAccessToken,
      // Usar test_event_code em todos os ambientes durante a depuração
      test_event_code: config.fbTestEventCode || "TEST12345"
    };
    
    // Log formatado
    const eventTime = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    logger.debug(`Enviando evento para Conversions API: ${eventName} (Nome: ${eventNameToSend})`);
    logger.debug(`Payload simplificado: ${JSON.stringify(requestData, null, 2)}`);
    
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
    
    // Log detalhado do código de status e corpo da resposta para depuração
    logger.debug(`Resposta da API (Status ${response.status}): ${responseText}`);
    
    if (!response.ok) {
      // Log mais detalhado do erro, incluindo headers de resposta para depuração
      const responseHeaders = Object.fromEntries([...response.headers.entries()]);
      
      logger.error(`Erro ao enviar evento para Conversions API: ${response.status} ${response.statusText}`, {
        eventName,
        eventId: serverData.event_id,
        error: responseText,
        requestData: JSON.stringify(requestData),
        responseHeaders: JSON.stringify(responseHeaders),
        fbPixelId: config.fbPixelId,
        tokenLength: config.fbAccessToken ? config.fbAccessToken.length : 0
      });
      return false;
    }
    
    try {
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
    } catch (parseError) {
      logger.error(`Erro ao processar resposta da API: ${parseError.message}`, {
        responseText,
        eventName,
        eventId: serverData.event_id
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