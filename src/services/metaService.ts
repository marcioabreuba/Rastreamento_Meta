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
    
    // Obter o nome do evento para a Conversions API (mapeado)
    const fbApiEventName = EVENT_MAPPING[eventName] || eventName;
    
    // Criar uma cópia dos dados do usuário e dos dados personalizados
    const userDataCopy = { ...userData };
    const customDataCopy = { ...customData };
    
    // Garantir que o FBP esteja no formato correto
    if (userDataCopy.fbp) {
      userDataCopy.fbp = validateFbp(userDataCopy.fbp);
    }
    
    // Lista de campos geográficos que não são aceitos diretamente na API do Facebook em user_data
    const geoFields = ['state', 'city', 'country', 'zip'];
    
    // Transferir campos geográficos de user_data para custom_data
    geoFields.forEach(field => {
      if (field in userDataCopy && userDataCopy[field] !== null) {
        // Adicionar prefixo "user_" para diferenciar de outros campos personalizados
        customDataCopy[`user_${field}`] = userDataCopy[field];
        // Remover do user_data para evitar erro na API
        delete userDataCopy[field];
      }
    });

    // Remover campos específicos de app quando não for um evento de app
    // Isso evita o erro "Unexpected key" na API
    const isAppEvent = serverData.action_source === 'app';
    if (!isAppEvent) {
      // Esses campos são válidos apenas para eventos de app
      const appOnlyFields = ['vendor_id', 'anon_id', 'madid'];
      appOnlyFields.forEach(field => {
        if (field in userDataCopy) {
          delete userDataCopy[field];
        }
      });
    }

    // Adicionar dados de geolocalização completos como um objeto separado se disponível
    if (serverData.geo_data) {
      customDataCopy.geo_data = serverData.geo_data;
    }
    
    // Preparar o evento principal
    const eventPayload: any = {
      event_name: fbApiEventName, // Usar o nome mapeado para o Facebook
      event_time: serverData.event_time,
      event_source_url: serverData.event_source_url,
      action_source: serverData.action_source,
      event_id: serverData.event_id,
      user_data: userDataCopy,
      custom_data: customDataCopy // Usando a cópia com os campos geográficos incluídos
    };

    // Garantir formatação correta para campos específicos no custom_data
    // O Facebook espera certos campos em formatos específicos
    
    // Preservar arrays para campos que aceitam arrays
    const arrayFields = ['content_ids', 'contents'];
    arrayFields.forEach(field => {
      if (field in customDataCopy && customDataCopy[field] !== null) {
        // Se já for um array, manter como está
        if (Array.isArray(customDataCopy[field])) {
          // Ok, já é um array
        } 
        // Se for uma string única que deve ser um array
        else if (typeof customDataCopy[field] === 'string' && field === 'content_ids') {
          customDataCopy[field] = [customDataCopy[field]];
        }
      }
    });

    // Converter content_category de array para string para a API do Facebook Conversions
    if (customDataCopy.content_category && Array.isArray(customDataCopy.content_category)) {
      // Se for um array, juntar os elementos com vírgula
      customDataCopy.content_category = customDataCopy.content_category.join(',');
    }

    // Converter content_name de array para string para a API do Facebook Conversions
    if (customDataCopy.content_name && Array.isArray(customDataCopy.content_name)) {
      // Se for um array, juntar os elementos com vírgula
      customDataCopy.content_name = customDataCopy.content_name.join(', ');
    }

    // Adicionando o nome do evento original como um campo personalizado
    customDataCopy.original_event_name = eventName;
    
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
    console.log('\n');
    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log(`│ 🔵 META PIXEL EVENTO RASTREADO: ${eventName.padEnd(28)} │`);
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log(`│ 📆 Data/Hora: ${eventTime.padEnd(42)} │`);
    console.log(`│ 🆔 Event ID: ${serverData.event_id.padEnd(42)} │`);
    console.log(`│ 🌐 URL: ${serverData.event_source_url.substr(0, 42).padEnd(42)} │`);
    console.log(`│ 🔄 Action Source: ${serverData.action_source.padEnd(42)} │`);
    console.log(`│ 📊 Evento Facebook: ${fbApiEventName.padEnd(42)} │`);
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log('│ 👤 DADOS DO USUÁRIO (ADVANCED MATCHING):                 │');
    console.log('├──────────────────────────────────────────────────────────┤');
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
    
    // Destacar os parâmetros do TracLead que foram adicionados
    const priorityParams = ['app', 'language', 'referrer', 'event_time', 'original_event_name'];
    
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
        key !== 'geo_data' && 
        !priorityParams.includes(key)
      ) {
        const displayValue = typeof value === 'object' 
          ? JSON.stringify(value).substring(0, 37) + '...' 
          : String(value).substring(0, 40);
        console.log(`│ ${key.padEnd(15)}: ${displayValue.padEnd(40)} │`);
      }
    });
    
    // Exibir dados geográficos de forma mais organizada se existirem
    if (customDataCopy.geo_data) {
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log('│ 🌎 DADOS GEOGRÁFICOS:                                    │');
      console.log('├──────────────────────────────────────────────────────────┤');
      const geo = customDataCopy.geo_data;
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
    if (eventPayload.data_processing_options) {
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log('│ 🛡️ OPÇÕES DE PROCESSAMENTO DE DADOS:                     │');
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log(`│ Opções:        ${String(eventPayload.data_processing_options.join(', ')).padEnd(40)} │`);
      if (eventPayload.data_processing_options_country !== undefined) {
        console.log(`│ País:          ${String(eventPayload.data_processing_options_country).padEnd(40)} │`);
      }
      if (eventPayload.data_processing_options_state !== undefined) {
        console.log(`│ Estado:        ${String(eventPayload.data_processing_options_state).padEnd(40)} │`);
      }
    }
    
    // Exibir segmentação de cliente se existir
    if (eventPayload.customer_segmentation) {
      console.log('├──────────────────────────────────────────────────────────┤');
      console.log('│ 👥 SEGMENTAÇÃO DE CLIENTE:                               │');
      console.log('├──────────────────────────────────────────────────────────┤');
      const cs = eventPayload.customer_segmentation;
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
    
    // Enviar para a API do Facebook
    const url = `${config.fbApiUrl}/${config.fbPixelId}/events`;
    
    logger.debug(`Enviando evento para Conversions API: ${eventName}`, { eventId: serverData.event_id });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    const responseData = await response.json();
    
    if (!response.ok || responseData.error) {
      throw new Error(`Erro na Conversions API: ${JSON.stringify(responseData)}`);
    }
    
    logger.info(`Evento enviado com sucesso para Conversions API: ${eventName}`, {
      eventId: serverData.event_id,
      response: responseData
    });
    
    return true;
  } catch (error: any) {
    logger.error(`Erro ao enviar evento para Conversions API: ${error.message}`, {
      error: error.message,
      eventName: event.eventName,
      eventId: event.serverData.event_id
    });
    
    return false;
  }
}; 