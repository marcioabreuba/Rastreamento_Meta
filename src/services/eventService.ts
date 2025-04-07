/**
 * Serviço para gerenciar eventos no banco de dados
 */

import { PrismaClient } from '@prisma/client';
import { NormalizedEvent } from '../types';
import { addEventToQueue } from '../utils/queue';
import logger from '../utils/logger';
import { sendToConversionsAPI } from './metaService';

// Inicializar cliente Prisma
const prisma = new PrismaClient();

/**
 * Salva um evento no banco de dados
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<number>} ID do evento salvo
 */
export const saveEvent = async (event: NormalizedEvent): Promise<number> => {
  try {
    const { eventName, userData, customData, serverData } = event;
    
    // Salvar no banco de dados
    const savedEvent = await prisma.event.create({
      data: {
        eventName,
        // Converter objetos para JSON antes de salvar
        userData: userData as unknown as any,
        customData: customData as unknown as any,
        serverData: serverData as unknown as any,
        status: 'pending'
      },
    });
    
    logger.info(`Evento salvo no banco de dados: ${eventName}`, { 
      eventId: savedEvent.id,
      eventName: savedEvent.eventName
    });
    
    return savedEvent.id;
  } catch (error: any) {
    logger.error(`Erro ao salvar evento no banco de dados: ${error.message}`, {
      error: error.message,
      eventName: event.eventName,
      eventId: event.serverData.event_id
    });
    
    throw error;
  }
};

/**
 * Processa um evento
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<boolean>} Indica se o processamento foi bem-sucedido
 */
export const processEvent = async (event: NormalizedEvent): Promise<boolean> => {
  try {
    // Adicionar à fila para processamento assíncrono
    await addEventToQueue(event);
    
    return true;
  } catch (error: any) {
    logger.error(`Erro ao processar evento: ${error.message}`, {
      error: error.message,
      eventName: event.eventName,
      eventId: event.serverData.event_id
    });
    
    return false;
  }
};

/**
 * Processa um evento da fila
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<boolean>} Indica se o processamento foi bem-sucedido
 */
export const processQueuedEvent = async (event: NormalizedEvent): Promise<boolean> => {
  try {
    // Enviar para a Conversions API
    const result = await sendToConversionsAPI(event);
    
    // Atualizar o status no banco de dados
    if (event.serverData && event.serverData.event_id) {
      const eventId = parseInt(event.serverData.event_id);
      if (!isNaN(eventId)) {
        await prisma.event.update({
          where: { id: eventId },
          data: { status: result ? 'sent' : 'failed' },
        });
      }
    }
    
    return result;
  } catch (error: any) {
    logger.error(`Erro ao processar evento da fila: ${error.message}`, {
      error: error.message,
      eventName: event.eventName,
      eventId: event.serverData.event_id
    });
    
    return false;
  }
};

/**
 * Busca eventos pendentes de envio
 * @param {number} limit - Limite de eventos a serem retornados
 * @returns {Promise<NormalizedEvent[]>} Lista de eventos pendentes
 */
export const getPendingEvents = async (limit: number = 100): Promise<NormalizedEvent[]> => {
  try {
    const pendingEvents = await prisma.event.findMany({
      where: { status: 'pending' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    
    // Converter para o formato NormalizedEvent
    return pendingEvents.map(event => ({
      eventName: event.eventName,
      userData: event.userData as any,
      customData: event.customData as any,
      serverData: event.serverData as any,
    }));
  } catch (error: any) {
    logger.error(`Erro ao buscar eventos pendentes: ${error.message}`, { error: error.message });
    return [];
  }
}; 