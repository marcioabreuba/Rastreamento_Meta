/**
 * Controlador para gerenciar requisições de eventos
 * 
 * Este controlador é responsável por:
 * 1. Receber e validar eventos do cliente
 * 2. Normalizar os dados do evento
 * 3. Adicionar informações de contexto (IP, User-Agent)
 * 4. Encaminhar para processamento assíncrono
 */

import { Request, Response } from 'express';
import { TrackRequest } from '../types';
import { normalizeEvent, validateFbp, EVENT_MAPPING } from '../utils/eventUtils';
import { saveEvent, processEvent, findOrCreateUser, updateUserData } from '../services/eventService';
import { generatePixelCode } from '../services/metaService';
import { getGeoIPInfo } from '../utils/geoip';
import logger from '../utils/logger';

/**
 * Inicializa informações de usuário e retorna dados para o cliente
 * @param {Request} req - Requisição
 * @param {Response} res - Resposta
 */
export const initUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({ error: 'ID de usuário é obrigatório' });
      return;
    }
    
    // Obter IP da requisição, preferindo IPv4
    let clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    
    // Se for IPv6 no formato ::ffff:IPv4, extrair apenas o IPv4
    if (clientIp && clientIp.includes('::ffff:')) {
      clientIp = clientIp.split('::ffff:')[1];
    }
    
    // Obter User-Agent
    const userAgent = req.headers['user-agent'] || '';
    
    // Obter FBP e FBC
    const fbp = req.body.fbp ? validateFbp(req.body.fbp) : null;
    const fbc = req.body.fbc || null;
    
    // Obter informações de geolocalização
    let geoData = null;
    try {
      geoData = getGeoIPInfo(clientIp);
      logger.debug(`Dados GeoIP obtidos para IP ${clientIp}`, {
        country: geoData?.country?.code,
        region: geoData?.region?.code,
        city: geoData?.city
      });
    } catch (geoError) {
      logger.warn(`Não foi possível obter informações de geolocalização: ${geoError.message}`);
    }
    
    // Inicializar usuário com dados disponíveis
    const userData = await findOrCreateUser(userId, {
      userId,
      ip: clientIp,
      userAgent,
      fbp,
      fbc,
      // Adicionar campos de dados pessoais se fornecidos
      firstName: req.body.fn,
      lastName: req.body.ln,
      email: req.body.em,
      phone: req.body.ph,
      // Adicionar dados de geolocalização
      country: geoData?.country?.code,
      state: geoData?.region?.code,
      city: geoData?.city,
      zip: geoData?.postal
    });
    
    // Retornar informações para o cliente
    res.status(200).json({
      userId,
      client_ip_address: clientIp,
      client_user_agent: userAgent,
      fbp,
      fbc,
      country: geoData?.country?.code,
      state: geoData?.region?.code,
      city: geoData?.city,
      zip: geoData?.postal
    });
  } catch (error: any) {
    logger.error(`Erro ao inicializar usuário: ${error.message}`, {
      error: error.message,
      body: req.body
    });
    
    res.status(500).json({
      error: 'Erro ao inicializar usuário',
      message: error.message,
    });
  }
};

/**
 * Processa uma requisição de rastreamento de evento
 * @param {Request} req - Requisição
 * @param {Response} res - Resposta
 */
export const trackEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar a requisição
    const { 
      eventName, 
      userData, 
      customData, 
      dataProcessingOptions, 
      dataProcessingOptionsCountry, 
      dataProcessingOptionsState,
      customerSegmentation,
      isAppEvent 
    } = req.body as TrackRequest;
    
    // Verificar se o evento foi especificado
    if (!eventName) {
      res.status(400).json({ error: 'Evento não especificado' });
      return;
    }
    
    // Verificar se o evento é válido (aceitar tanto os mapeados quanto os eventos brutos)
    const isStandardEvent = EVENT_MAPPING[eventName] !== undefined;
    const isCustomEvent = Object.values(EVENT_MAPPING).includes(eventName);
    
    // Log mais detalhado para depuração de eventos
    if (!isStandardEvent && !isCustomEvent) {
      logger.warn(`Evento não reconhecido: ${eventName}. Verificar implementação.`, {
        eventName,
        isAppEvent: isAppEvent || false,
        knownEvents: Object.keys(EVENT_MAPPING).slice(0, 5).join(', ') + '...',
        customData: JSON.stringify(customData || {}).substring(0, 100)
      });
      // Permitir eventos não mapeados para flexibilidade, mas logar aviso
    } else {
      logger.debug(`Evento reconhecido: ${eventName} → ${EVENT_MAPPING[eventName] || eventName}`);
    }
    
    // Adicionar IP ao userData se não estiver presente
    const userDataWithIP = userData || {};
    if (!userDataWithIP.ip) {
      // Obter IP da requisição, preferindo IPv4
      let clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      
      // Se for IPv6 no formato ::ffff:IPv4, extrair apenas o IPv4
      if (clientIp && clientIp.includes('::ffff:')) {
        clientIp = clientIp.split('::ffff:')[1];
      }
      
      userDataWithIP.ip = clientIp;
      
      logger.debug(`IP detectado para evento ${eventName}: ${clientIp}`);
      
      // Obter e adicionar informações de geolocalização
      try {
        const geoData = getGeoIPInfo(clientIp);
        if (geoData) {
          // Adicionar informações ao userData se não estiverem presentes
          if (!userDataWithIP.country && geoData.country?.code) {
            userDataWithIP.country = geoData.country.code;
          }
          if (!userDataWithIP.state && geoData.region?.code) {
            userDataWithIP.state = geoData.region.code;
          }
          if (!userDataWithIP.city && geoData.city) {
            userDataWithIP.city = geoData.city;
          }
          if (!userDataWithIP.zip && geoData.postal) {
            userDataWithIP.zip = geoData.postal;
          }
          
          logger.debug(`Dados de geolocalização adicionados ao evento: ${eventName}`, {
            country: userDataWithIP.country,
            state: userDataWithIP.state,
            city: userDataWithIP.city,
            zip: userDataWithIP.zip
          });
        }
      } catch (geoError) {
        logger.warn(`Não foi possível enriquecer com GeoIP: ${geoError.message}`);
      }
    }
    
    // Adicionar User-Agent ao userData se não estiver presente
    if (!userDataWithIP.userAgent) {
      userDataWithIP.userAgent = req.headers['user-agent'] || '';
    }
    
    // Validar e corrigir FBP se existir
    if (userDataWithIP.fbp) {
      userDataWithIP.fbp = validateFbp(userDataWithIP.fbp);
    }
    
    // Se tivermos userId, atualizar dados de usuário no cache
    if (userDataWithIP.userId) {
      try {
        await updateUserData(userDataWithIP.userId, userDataWithIP);
        logger.debug(`Dados de usuário atualizados para evento ${eventName}`);
      } catch (userError) {
        logger.warn(`Erro ao atualizar dados de usuário: ${userError.message}`);
      }
    }
    
    // Melhorar a detecção de categoria para eventos de visualização de categoria
    const customDataFinal = { ...customData };
    
    // Para eventos de categoria, verificar se há URL que contenha o nome da categoria
    if (eventName === 'ViewCategory' && customDataFinal.sourceUrl) {
      try {
        const url = new URL(customDataFinal.sourceUrl.toString());
        // Extrair o último segmento do caminho da URL
        const pathParts = url.pathname.split('/');
        const lastSegment = pathParts[pathParts.length - 1];
        
        // Se o segmento não for vazio e não for genérico
        if (lastSegment && !['collection', 'colecao', 'categoria', 'collections'].includes(lastSegment)) {
          // Formatar o nome da categoria para ser mais legível
          const categoryName = lastSegment
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          // Definir como content_category apenas se não existir
          if (!customDataFinal.contentCategory && !customDataFinal.content_category) {
            customDataFinal.content_category = categoryName;
            logger.debug(`Categoria detectada da URL: ${categoryName}`);
          }
        }
      } catch (urlError) {
        // Ignorar erros de parsing de URL
        logger.debug(`Erro ao processar URL para detecção de categoria: ${urlError.message}`);
      }
    }
    
    // Adicionar dados de eventos de rolagem
    if (eventName.startsWith('Scroll_') && !customDataFinal.scrollPercentage) {
      // Extrair a porcentagem do nome do evento (ex: Scroll_25 -> 25)
      const percentage = parseInt(eventName.split('_')[1]);
      if (!isNaN(percentage)) {
        customDataFinal.scrollPercentage = percentage;
      }
    }
    
    // Adicionar dados de eventos de vídeo
    if (eventName.startsWith('ViewVideo_') && !customDataFinal.videoPercentage) {
      // Extrair a porcentagem do nome do evento (ex: ViewVideo_25 -> 25)
      const percentage = parseInt(eventName.split('_')[1]);
      if (!isNaN(percentage)) {
        customDataFinal.videoPercentage = percentage;
      }
    }
    
    // Normalizar o evento com todos os parâmetros
    const normalizedEvent = normalizeEvent({
      eventName,
      userData: userDataWithIP,
      customData: customDataFinal,
      dataProcessingOptions,
      dataProcessingOptionsCountry,
      dataProcessingOptionsState,
      customerSegmentation,
      isAppEvent,
      isServerEvent: true
    });
    
    // Determinar a origem do evento para logging
    const eventSource = isAppEvent ? 'app' : 'web';
    
    logger.info(`Recebido evento para rastreamento: ${eventName} (origem: ${eventSource})`, {
      eventName,
      eventId: normalizedEvent.serverData.event_id,
      ip: userDataWithIP.ip,
      eventSource,
      url: normalizedEvent.serverData.event_source_url?.substring(0, 100)
    });
    
    // Salvar o evento no banco de dados
    await saveEvent(normalizedEvent);
    
    // Processar o evento (adicionar à fila)
    await processEvent(normalizedEvent);
    
    // Retornar resposta de sucesso
    res.status(200).json({
      success: true,
      eventId: normalizedEvent.serverData.event_id,
      eventName: normalizedEvent.eventName,
      eventSource
    });
  } catch (error: any) {
    logger.error(`Erro ao processar requisição de rastreamento: ${error.message}`, {
      error: error.message,
      body: req.body
    });
    
    res.status(500).json({
      error: 'Erro ao processar evento',
      message: error.message,
    });
  }
};

/**
 * Retorna o código do pixel para um evento
 * @param {Request} req - Requisição
 * @param {Response} res - Resposta
 */
export const getPixelCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      eventName, 
      userData, 
      customData,
      dataProcessingOptions, 
      dataProcessingOptionsCountry, 
      dataProcessingOptionsState,
      customerSegmentation,
      isAppEvent 
    } = req.body as TrackRequest;
    
    if (!eventName) {
      res.status(400).json({ error: 'Evento não especificado' });
      return;
    }
    
    // Validar e corrigir FBP se existir
    const userDataFixed = { ...userData };
    if (userDataFixed && userDataFixed.fbp) {
      userDataFixed.fbp = validateFbp(userDataFixed.fbp);
    }
    
    // Normalizar o evento
    const normalizedEvent = normalizeEvent({
      eventName,
      userData: userDataFixed,
      customData,
      dataProcessingOptions,
      dataProcessingOptionsCountry,
      dataProcessingOptionsState,
      customerSegmentation,
      isAppEvent,
      isServerEvent: true
    });
    
    // Gerar código do pixel
    const pixelCode = generatePixelCode(normalizedEvent);
    
    // Retornar o código do pixel
    res.status(200).send(pixelCode);
  } catch (error: any) {
    logger.error(`Erro ao gerar código do pixel: ${error.message}`, {
      error: error.message,
      body: req.body
    });
    
    res.status(500).json({
      error: 'Erro ao gerar código do pixel',
      message: error.message,
    });
  }
};

/**
 * Retorna o status do serviço
 * @param {Request} req - Requisição
 * @param {Response} res - Resposta
 */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      status: 'online',
      version: '1.5.0',
      message: 'Meta Tracking Server funcionando normalmente'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao verificar status',
      message: error.message,
    });
  }
}; 