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
    
    try {
      // Salvar no banco de dados
      const savedEvent = await prisma.event.create({
        data: {
          eventName,
          // Converter objetos para JSON antes de salvar
          userData: userData as unknown as any,
          customData: customData as unknown as any,
          serverData: serverData as unknown as any,
          // O status é definido no schema com valor padrão, não precisamos incluí-lo
        },
      });
      
      logger.info(`Evento salvo no banco de dados: ${eventName}`, { 
        eventId: savedEvent.id,
        eventName: savedEvent.eventName
      });
      
      // Converter o ID do evento para número
      return Number(savedEvent.id);
    } catch (dbError: any) {
      // Se houver um erro de violação de restrição única, apenas registrar e retornar ID genérico
      if (dbError.code === 'P2002' || dbError.message.includes('Unique constraint failed')) {
        logger.info(`Evento possivelmente duplicado, ignorando erro: ${eventName}`, {
          eventName: eventName,
          fbEventId: serverData.event_id
        });
        
        // Retornar um ID genérico para permitir que o processamento continue
        return -1;
      }
      
      // Se for outro tipo de erro, repassar
      throw dbError;
    }
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
      try {
        // Converter o event_id para um número, já que o ID no banco é um número
        // Se não for possível converter, ignorar a atualização do banco
        const eventIdString = event.serverData.event_id;
        const eventId = parseInt(eventIdString);
        
        if (!isNaN(eventId)) {
          // Usando updateMany para atualizar sem precisar do ID exato,
          // e para evitar erros de tipagem com o campo status
          await prisma.$executeRaw`
            UPDATE "Event" 
            SET status = ${result ? 'sent' : 'failed'} 
            WHERE id = ${eventId};
          `;
          
          logger.debug(`Status do evento atualizado: ${event.eventName}`, {
            eventId,
            status: result ? 'sent' : 'failed'
          });
        }
      } catch (dbError) {
        logger.warn(`Não foi possível atualizar o evento no banco de dados: ${dbError.message}`, {
          eventName: event.eventName,
          eventId: event.serverData.event_id
        });
        // Continuamos o processamento mesmo com erro no banco de dados
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
    // Usando raw query para evitar problemas de tipagem com o campo status
    const pendingEvents = await prisma.$queryRaw`
      SELECT * FROM "Event" 
      WHERE status = 'pending' 
      ORDER BY "createdAt" ASC 
      LIMIT ${limit};
    `;
    
    // Converter para o formato NormalizedEvent
    return (pendingEvents as any[]).map(event => ({
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