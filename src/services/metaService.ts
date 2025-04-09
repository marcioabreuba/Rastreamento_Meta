/**
 * Serviço para enviar eventos para o Meta (Facebook Pixel e Conversions API)
 */

import fetch from 'node-fetch';
import { NormalizedEvent } from '../types';
import config from '../config';
import logger from '../utils/logger';
import { EVENT_MAPPING, validateFbp } from '../utils/eventUtils';
import axios from 'axios';

// Interfaces para tipagem do payload
interface UserDataPayload {
  client_ip_address: string;
  client_user_agent: string;
  external_id: string;
  fbp?: string;
  fbc?: string;
  em?: string;
  ph?: string;
  country?: string;
  ct?: string;  // city
  st?: string;  // state
  zp?: string;  // zip code
}

interface CustomDataPayload {
  currency: string;
  value: number;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  content_category?: string;
  num_items?: number;
  order_id?: string;
  search_string?: string;
}

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
    
    // Construir a URL para o endpoint da API - Atualizado para v19.0
    const apiUrl = `https://graph.facebook.com/v19.0/${config.fbPixelId}/events`;
    
    // Obter o nome do evento (usar nome original para eventos personalizados)
    const eventNameToSend = EVENT_MAPPING[eventName] || eventName;
    
    // ======= PAYLOAD EXPANDIDO MAS CONTROLADO =======
    // Após ter sucesso com o payload mínimo, vamos expandir gradualmente
    // adicionando campos úteis mas mantendo a estabilidade
    
    // Estrutura de userData com campos essenciais e mais alguns úteis
    const userData_payload: UserDataPayload = {
      client_ip_address: userData.client_ip_address || "127.0.0.1",
      client_user_agent: userData.client_user_agent || "",
      external_id: userData.external_id || `user_${Date.now()}`
    };
    
    // Adicionar campos de Advanced Matching se disponíveis
    // Isso melhora significativamente a qualidade do matching sem arriscar erros
    if (userData.fbp) userData_payload.fbp = userData.fbp;
    if (userData.fbc) userData_payload.fbc = userData.fbc;
    if (userData.em) userData_payload.em = userData.em;
    if (userData.ph) userData_payload.ph = userData.ph;
    if (userData.country) userData_payload.country = userData.country;
    if (userData.city) userData_payload.ct = userData.city;
    if (userData.state) userData_payload.st = userData.state;
    if (userData.zip) userData_payload.zp = userData.zip;
    
    // Estrutura de customData com campos essenciais e mais alguns úteis
    const customData_payload: CustomDataPayload = {
      currency: customData.currency || "BRL",
      value: customData.value || 0
    };
    
    // Adicionar dados específicos de produto/conteúdo se disponíveis
    if (customData.content_name) 
      customData_payload.content_name = customData.content_name;
    
    if (customData.content_type) 
      customData_payload.content_type = customData.content_type;
    
    if (customData.content_ids) {
      // Garantir que content_ids sempre seja um array
      customData_payload.content_ids = Array.isArray(customData.content_ids) 
        ? customData.content_ids 
        : [customData.content_ids];
    }
    
    // Criar payload expandido mas controlado
    const eventPayload = {
      event_name: eventNameToSend,
      event_time: Math.floor(Date.now() / 1000),
      event_id: serverData.event_id,
      action_source: "website",
      event_source_url: serverData.event_source_url || `https://${config.shopifyDomain}`,
      user_data: userData_payload,
      custom_data: customData_payload
    };
    
    // Preparar os dados completos para envio
    const requestData = {
      data: [eventPayload],
      access_token: config.fbAccessToken,
      // Usar test_event_code apenas em desenvolvimento
      test_event_code: config.nodeEnv === 'development' ? (config.fbTestEventCode || "TEST12345") : undefined
    };
    
    // Log formatado
    const eventTime = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    logger.debug(`Enviando evento para Conversions API: ${eventName} (Nome: ${eventNameToSend})`);
    logger.debug(`Payload expandido: ${JSON.stringify(requestData, null, 2)}`);
    
    // Log formatado similar ao Pixel Helper para debug
    console.log('\n');
    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log(`│ 🔵 META PIXEL EVENTO RASTREADO: ${eventName.padEnd(28)} │`);
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log(`│ 📆 Data/Hora: ${eventTime.padEnd(42)} │`);
    console.log(`│ 🆔 Event ID: ${serverData.event_id.padEnd(42)} │`);
    console.log(`│ 🌐 URL: ${(serverData.event_source_url || '').substring(0, 42).padEnd(42)} │`);
    console.log(`│ 🔄 Action Source: ${eventPayload.action_source.padEnd(42)} │`);
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log('│ 👤 DADOS DO USUÁRIO (ADVANCED MATCHING):                 │');
    console.log('├──────────────────────────────────────────────────────────┤');
    
    // Criar uma cópia dos dados do usuário para exibição formatada
    const userDataCopy = { ...userData_payload };
    
    Object.entries(userDataCopy).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Limitar a exibição de hashes
        const displayValue = typeof value === 'string' && value.length > 20 
          ? value.substring(0, 17) + '...' 
          : value;
        console.log(`│ ${key.padEnd(15)}: ${String(displayValue).padEnd(40)} │`);
      }
    });
    
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log('│ 📊 DADOS PERSONALIZADOS:                                 │');
    console.log('├──────────────────────────────────────────────────────────┤');
    
    // Criar uma cópia dos dados personalizados para exibição formatada
    const customDataCopy = { 
      ...customData_payload,
      app: 'meta-tracking',
      language: customData.language || 'pt-BR',
      referrer: customData.referrer || serverData.referrer_url || null,
      event_time: Math.floor(Date.now() / 1000)
    };
    
    // Destacar os parâmetros prioritários
    const priorityParams = ['app', 'language', 'referrer', 'event_time'];
    
    // Primeiro exibir os parâmetros prioritários
    priorityParams.forEach(param => {
      if (customDataCopy[param] !== null && customDataCopy[param] !== undefined) {
        let displayValue = customDataCopy[param];
        if (param === 'event_time') {
          // Formatar timestamp para data legível
          displayValue = new Date(customDataCopy[param] * 1000).toISOString();
        }
        console.log(`│ ${param.padEnd(15)}: ${String(displayValue).padEnd(40)} │`);
      }
    });
    
    // Depois exibir os demais parâmetros
    Object.entries(customDataCopy).forEach(([key, value]) => {
      if (
        value !== null && 
        value !== undefined && 
        !priorityParams.includes(key)
      ) {
        const displayValue = typeof value === 'object' 
          ? JSON.stringify(value).substring(0, 37) + '...' 
          : String(value).substring(0, 40);
        console.log(`│ ${key.padEnd(15)}: ${displayValue.padEnd(40)} │`);
      }
    });
    
    // Exibir dados geográficos se existirem
    if (serverData.geo_data) {
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log('│ 🌎 DADOS GEOGRÁFICOS:                                    │');
      console.log('├──────────────────────────────────────────────────────────┤');
      const geo = serverData.geo_data;
      if (geo.country && geo.country.name) {
        console.log(`│ País:          ${String(geo.country.name + ' (' + geo.country.code + ')').padEnd(40)} │`);
      }
      if (geo.region && geo.region.name) {
        console.log(`│ Estado:        ${String(geo.region.name + ' (' + geo.region.code + ')').padEnd(40)} │`);
      }
      if (geo.city) {
        console.log(`│ Cidade:        ${String(geo.city).padEnd(40)} │`);
      }
      if (geo.postal) {
        console.log(`│ CEP:           ${String(geo.postal).padEnd(40)} │`);
      }
      if (geo.location) {
        console.log(`│ Coordenadas:   ${String(`${geo.location.latitude}, ${geo.location.longitude}`).padEnd(40)} │`);
      }
    }
    
    // Exibir opções de processamento de dados se existirem
    if (serverData.data_processing_options) {
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log('│ 🛡️ OPÇÕES DE PROCESSAMENTO DE DADOS:                     │');
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log(`│ Opções:        ${String(serverData.data_processing_options.join(', ')).padEnd(40)} │`);
      if (serverData.data_processing_options_country !== undefined) {
        console.log(`│ País:          ${String(serverData.data_processing_options_country).padEnd(40)} │`);
      }
      if (serverData.data_processing_options_state !== undefined) {
        console.log(`│ Estado:        ${String(serverData.data_processing_options_state).padEnd(40)} │`);
      }
    }
    
    // Exibir segmentação de cliente se existir
    if (serverData.customer_segmentation) {
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log('│ 👥 SEGMENTAÇÃO DE CLIENTE:                               │');
      console.log('├──────────────────────────────────────────────────────────┤');
      const cs = serverData.customer_segmentation;
      if (cs.priority_segment) {
        console.log(`│ Segmento:      ${String(cs.priority_segment).padEnd(40)} │`);
      }
      if (cs.lifecycle_stage) {
        console.log(`│ Ciclo de Vida: ${String(cs.lifecycle_stage).padEnd(40)} │`);
      }
      if (cs.predicted_ltv_range) {
        console.log(`│ Faixa LTV:     ${String(cs.predicted_ltv_range).padEnd(40)} │`);
      }
    }
    
    console.log('└──────────────────────────────────────────────────────────┘');
    console.log('\n');
    
    // Enviar para a API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // Log detalhado do payload enviado para a API
    logger.debug(`Payload enviado para API do Meta: ${eventNameToSend}`, {
      event_name: eventPayload.event_name,
      event_id: eventPayload.event_id,
      payload: {
        event_name: eventPayload.event_name,
        event_time: eventPayload.event_time,
        user_data: {
          external_id: userData_payload.external_id?.substring(0, 8) + '...',
          has_email: !!userData_payload.em,
          has_phone: !!userData_payload.ph,
          has_fbp: !!userData_payload.fbp,
          has_fbc: !!userData_payload.fbc,
          has_geo: !!(userData_payload.country || userData_payload.ct || userData_payload.st || userData_payload.zp)
        },
        custom_data: {
          currency: customData_payload.currency,
          value: customData_payload.value,
          has_content_ids: !!customData_payload.content_ids,
          has_content_name: !!customData_payload.content_name
        }
      }
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

/**
 * Prepara o payload para envio ao Meta Conversions API
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Object} Payload formatado para API
 */
export const preparePayload = (event: NormalizedEvent): any => {
  const { eventName, userData, customData, serverData } = event;
  
  // Verificar se temos os tokens necessários
  if (!config.fbAccessToken) {
    logger.error('Token de acesso do Facebook não configurado. Evento não enviado para Conversions API.');
    throw new Error('Token de acesso do Facebook não configurado');
  }
  
  // Obter o nome do evento (usar nome original para eventos personalizados)
  const eventNameToSend = EVENT_MAPPING[eventName] || eventName;
  
  // Estrutura de userData com campos essenciais e mais alguns úteis
  const userData_payload: UserDataPayload = {
    client_ip_address: userData.client_ip_address || "127.0.0.1",
    client_user_agent: userData.client_user_agent || "",
    external_id: userData.external_id || `user_${Date.now()}`
  };
  
  // Adicionar campos de Advanced Matching se disponíveis
  if (userData.fbp) userData_payload.fbp = userData.fbp;
  if (userData.fbc) userData_payload.fbc = userData.fbc;
  if (userData.em) userData_payload.em = userData.em;
  if (userData.ph) userData_payload.ph = userData.ph;
  if (userData.country) userData_payload.country = userData.country;
  if (userData.city) userData_payload.ct = userData.city;
  if (userData.state) userData_payload.st = userData.state;
  if (userData.zip) userData_payload.zp = userData.zip;
  
  // Estrutura de customData com campos essenciais e mais alguns úteis
  const customData_payload: CustomDataPayload = {
    currency: customData.currency || "BRL",
    value: customData.value || 0
  };
  
  // Adicionar dados específicos de produto/conteúdo se disponíveis
  if (customData.content_name) 
    customData_payload.content_name = customData.content_name;
  
  if (customData.content_type) 
    customData_payload.content_type = customData.content_type;
  
  if (customData.content_ids) {
    // Garantir que content_ids sempre seja um array
    customData_payload.content_ids = Array.isArray(customData.content_ids) 
      ? customData.content_ids 
      : [customData.content_ids];
  }
  
  // Criar payload expandido mas controlado
  const eventPayload = {
    event_name: eventNameToSend,
    event_time: Math.floor(Date.now() / 1000),
    event_id: serverData.event_id,
    action_source: "website",
    event_source_url: serverData.event_source_url || `https://${config.shopifyDomain}`,
    user_data: userData_payload,
    custom_data: customData_payload
  };
  
  // Preparar os dados completos para envio
  return {
    data: [eventPayload],
    access_token: config.fbAccessToken,
    // Usar test_event_code apenas em desenvolvimento
    test_event_code: config.nodeEnv === 'development' ? (config.fbTestEventCode || "TEST12345") : undefined
  };
};

/**
 * Envia evento para o Conversions API do Facebook
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<any>} - Resposta da API
 */
export const sendEventToConversionsAPI = async (event: NormalizedEvent): Promise<any> => {
  try {
    const { eventName, userData, customData, serverData } = event;
    
    // Preparar payload para API
    const payload = preparePayload(event);
    
    // Log detalhado do payload
    logger.debug(`Enviando evento para Meta API: ${eventName}`, {
      eventId: serverData.event_id,
      payload: JSON.stringify(payload),
      userData: {
        hasExternalId: !!userData.external_id,
        hasEmail: !!userData.em,
        hasPhone: !!userData.ph,
        hasFbp: !!userData.fbp,
        hasFbc: !!userData.fbc,
        hasGeo: !!(userData.country || userData.city || userData.state)
      },
      customData: {
        currency: customData?.currency,
        value: customData?.value,
        contentIds: customData?.content_ids,
        contentNames: customData?.content_name
      }
    });
    
    // Configuração da requisição
    const response = await axios.post(config.fbApiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Log da resposta
    logger.debug(`Resposta da Meta API para evento ${eventName}`, {
      eventId: serverData.event_id,
      statusCode: response.status,
      responseData: JSON.stringify(response.data)
    });
    
    return response.data;
  } catch (error: any) {
    logger.error(`Erro ao enviar evento para Meta API: ${error.message}`, {
      eventName: event.eventName,
      eventId: event.serverData.event_id,
      errorDetails: error.response?.data ? JSON.stringify(error.response.data) : null,
      statusCode: error.response?.status
    });
    throw error;
  }
}; 