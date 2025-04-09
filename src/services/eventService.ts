/**
 * Serviço para gerenciar eventos no banco de dados
 */

import { PrismaClient } from '@prisma/client';
import { NormalizedEvent, UserData } from '../types';
import { addEventToQueue } from '../utils/queue';
import logger from '../utils/logger';
import { sendToConversionsAPI } from './metaService';

// Inicializar cliente Prisma
const prisma = new PrismaClient();

// Cache em memória para informações de usuário (simulando tabela users)
const userCache: Record<string, UserData> = {};

/**
 * Busca ou cria dados de usuário pelo external_id
 * @param {string} externalId - ID externo do usuário
 * @param {UserData} [initialData] - Dados iniciais do usuário (opcional)
 * @returns {Promise<UserData>} Dados do usuário
 */
export const findOrCreateUser = async (externalId: string, initialData?: Partial<UserData>): Promise<UserData> => {
  try {
    // Se já temos no cache, retornar
    if (userCache[externalId]) {
      return userCache[externalId];
    }
    
    // Buscar no banco de dados
    // Nota: Estamos simulando banco de dados com cache em memória
    // Em um ambiente real, isso seria uma consulta ao banco
    
    // Se não encontrado e temos dados iniciais, criar
    if (initialData) {
      const userData: UserData = {
        userId: externalId,
        ...initialData
      };
      
      // Armazenar no cache em memória
      userCache[externalId] = userData;
      
      logger.debug(`Usuário criado/atualizado no cache: ${externalId}`, {
        userId: externalId,
        hasData: Object.keys(initialData).filter(k => initialData[k] !== undefined && initialData[k] !== null).join(', ')
      });
      
      return userData;
    }
    
    // Se não encontrado e não temos dados iniciais, retornar objeto vazio
    return { userId: externalId } as UserData;
  } catch (error: any) {
    logger.error(`Erro ao buscar/criar usuário: ${error.message}`, {
      error: error.message,
      externalId
    });
    
    return { userId: externalId } as UserData;
  }
};

/**
 * Atualiza dados de usuário existente
 * @param {string} externalId - ID externo do usuário
 * @param {Partial<UserData>} newData - Novos dados do usuário
 * @returns {Promise<UserData>} Dados atualizados do usuário
 */
export const updateUserData = async (externalId: string, newData: Partial<UserData>): Promise<UserData> => {
  try {
    // Buscar usuário existente
    const existingData = userCache[externalId] || { userId: externalId };
    
    // Mesclar dados
    const updatedData: UserData = {
      ...existingData,
      ...newData,
    };
    
    // Armazenar no cache
    userCache[externalId] = updatedData;
    
    logger.debug(`Dados de usuário atualizados: ${externalId}`, {
      userId: externalId,
      updatedFields: Object.keys(newData).filter(k => newData[k] !== undefined && newData[k] !== null).join(', ')
    });
    
    return updatedData;
  } catch (error: any) {
    logger.error(`Erro ao atualizar dados de usuário: ${error.message}`, {
      error: error.message,
      externalId
    });
    
    return userCache[externalId] || { userId: externalId } as UserData;
  }
};

/**
 * Enriquece evento com dados do usuário conhecidos
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<NormalizedEvent>} Evento enriquecido
 */
export const enrichEventWithUserData = async (event: NormalizedEvent): Promise<NormalizedEvent> => {
  try {
    // Obter ID externo do usuário
    const externalId = event.userData.external_id;
    
    if (!externalId) {
      logger.debug(`Evento sem external_id, não será enriquecido`);
      return event;
    }
    
    // Buscar dados do usuário
    const userData = await findOrCreateUser(externalId);
    
    // Adicionar dados faltantes do usuário se disponíveis no cache
    const enrichedUserData = { ...event.userData };
    
    // Lista de campos que podem ser enriquecidos
    const fieldsToEnrich = [
      { from: 'fbp', to: 'fbp' },
      { from: 'fbc', to: 'fbc' },
      { from: 'email', to: 'em' },
      { from: 'phone', to: 'ph' },
      { from: 'firstName', to: 'fn' },
      { from: 'lastName', to: 'ln' },
      { from: 'city', to: 'city' },
      { from: 'state', to: 'state' },
      { from: 'country', to: 'country' },
      { from: 'zip', to: 'zip' }
    ];
    
    // Enriquecer apenas campos nulos/vazios
    const enriched: string[] = [];
    
    fieldsToEnrich.forEach(field => {
      if (!enrichedUserData[field.to] && userData[field.from]) {
        enrichedUserData[field.to] = userData[field.from];
        enriched.push(field.to);
      }
    });
    
    if (enriched.length > 0) {
      logger.info(`Evento enriquecido com dados do usuário: ${externalId}`, {
        eventName: event.eventName,
        enrichedFields: enriched.join(', ')
      });
    }
    
    // Retornar evento enriquecido
    return {
      ...event,
      userData: enrichedUserData
    };
  } catch (error: any) {
    logger.error(`Erro ao enriquecer evento: ${error.message}`, {
      error: error.message,
      eventName: event.eventName,
      eventId: event.serverData.event_id
    });
    
    return event;
  }
};

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
    // Atualizar cache de usuário com novos dados se tivermos external_id
    if (event.userData.external_id) {
      // Extrair dados para o userCache
      const { 
        external_id, client_ip_address, client_user_agent, 
        fbp, fbc, em, ph, fn, ln, city, state, country, zip
      } = event.userData;
      
      // Atualizar dados do usuário no cache
      await updateUserData(external_id, {
        userId: external_id,
        ip: client_ip_address,
        userAgent: client_user_agent,
        fbp: fbp,
        fbc: fbc,
        email: em,
        phone: ph,
        firstName: fn,
        lastName: ln,
        city: city,
        state: state,
        country: country,
        zip: zip
      });
    }
    
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
    // Enriquecer evento com dados do usuário conhecidos antes de enviar
    const enrichedEvent = await enrichEventWithUserData(event);
    
    // Enviar para a Conversions API
    const result = await sendToConversionsAPI(enrichedEvent);
    
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