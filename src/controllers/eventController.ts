/**
 * Controlador para gerenciar requisições de eventos
 */

import { Request, Response } from 'express';
import { TrackRequest } from '../types';
import { normalizeEvent } from '../utils/eventUtils';
import { saveEvent, processEvent } from '../services/eventService';
import { generatePixelCode } from '../services/metaService';
import logger from '../utils/logger';

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
    
    if (!eventName) {
      res.status(400).json({ error: 'Evento não especificado' });
      return;
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
    }
    
    // Adicionar User-Agent ao userData se não estiver presente
    if (!userDataWithIP.userAgent) {
      userDataWithIP.userAgent = req.headers['user-agent'] || '';
    }
    
    // Normalizar o evento com todos os parâmetros
    const normalizedEvent = normalizeEvent({
      eventName,
      userData: userDataWithIP,
      customData,
      dataProcessingOptions,
      dataProcessingOptionsCountry,
      dataProcessingOptionsState,
      customerSegmentation,
      isAppEvent
    });
    
    // Determinar a origem do evento para logging
    const eventSource = isAppEvent ? 'app' : 'web';
    
    logger.info(`Recebido evento para rastreamento: ${eventName} (origem: ${eventSource})`, {
      eventName,
      eventId: normalizedEvent.serverData.event_id,
      ip: userDataWithIP.ip,
      eventSource
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
    
    // Normalizar o evento
    const normalizedEvent = normalizeEvent({
      eventName,
      userData,
      customData,
      dataProcessingOptions,
      dataProcessingOptionsCountry,
      dataProcessingOptionsState,
      customerSegmentation,
      isAppEvent
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