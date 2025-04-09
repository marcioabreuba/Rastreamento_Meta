/**
 * Sistema de filas usando Bull para processamento assíncrono
 * Com fallback para implementação em memória quando o Redis não estiver disponível
 */

import { Queue, Worker, Job } from 'bullmq';
import { NormalizedEvent } from '../types';
import { processQueuedEvent } from '../services/eventService';
import logger from './logger';
import config from '../config';

// Implementação em memória para usar em caso de falha do Redis
class InMemoryQueue {
  private events: Map<string, any> = new Map();
  private processCallback: Function | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  async add(data: any, options: any = {}): Promise<{ id: string }> {
    const jobId = options.jobId || `local-${Date.now()}`;
    
    this.events.set(jobId, {
      id: jobId,
      data: data
    });
    
    logger.info(`Evento adicionado à fila em memória: ${data.eventName} (ID: ${jobId})`);
    
    // Processa o evento imediatamente se houver um callback registrado
    if (this.processCallback) {
      setTimeout(() => {
        const job = this.events.get(jobId);
        if (job) {
          try {
            const result = this.processCallback!(job.data);
            this.trigger('completed', job);
            return result;
          } catch (error: any) {
            this.trigger('failed', job, error);
          }
        }
      }, 100);
    }
    
    return { id: jobId };
  }

  process(callback: Function): void {
    this.processCallback = callback;
    logger.info('Processador de fila em memória registrado');
  }

  on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
  }

  private trigger(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          logger.error(`Erro no handler de evento ${event}:`, error);
        }
      });
    }
  }
}

// Configurações da conexão Redis
const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  username: config.redis.username
};

// Nome da fila
const queueName = 'events';

// Instância da fila
let eventQueue: Queue;
let worker: Worker;

/**
 * Inicializa a fila de eventos
 */
export const initQueue = async (): Promise<void> => {
  try {
    // Criar a fila
    eventQueue = new Queue(queueName, {
      connection: redisOptions,
      defaultJobOptions: {
        attempts: 2, // Limitar a 2 tentativas para evitar loops infinitos
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      }
    });
    
    // Criar o worker para processar a fila
    worker = new Worker(queueName, async (job: Job) => {
      const event = job.data as NormalizedEvent;
      
      logger.info(`Processando evento da fila: ${event.eventName}`, {
        eventId: event.serverData.event_id,
        jobId: job.id,
        attempt: job.attemptsMade
      });
      
      try {
        // Processar o evento
        const result = await processQueuedEvent(event);
        
        if (!result) {
          throw new Error(`Falha ao processar evento: ${event.eventName}`);
        }
        
        return result;
      } catch (error: any) {
        logger.error(`Falha ao processar evento: ${event.eventName}`, {
          error: error.message,
          eventId: event.serverData.event_id,
          jobId: job.id,
          attempt: job.attemptsMade,
          totalAttempts: job.opts.attempts
        });
        
        // Registrar detalhes do evento que falhou para diagnóstico
        logger.debug(`Detalhes do evento que falhou:`, {
          eventName: event.eventName,
          eventId: event.serverData.event_id,
          userData: JSON.stringify({
            client_ip_address: event.userData.client_ip_address,
            client_user_agent: event.userData.client_user_agent?.substring(0, 50), // Truncar UA
            external_id: event.userData.external_id,
            hasEmail: !!event.userData.em,
            hasPhone: !!event.userData.ph,
            hasFbp: !!event.userData.fbp
          }),
          customData: JSON.stringify({
            currency: event.customData.currency,
            value: event.customData.value,
            content_name: event.customData.content_name
          })
        });
        
        throw error;
      }
    }, {
      connection: redisOptions,
      concurrency: 1,
      lockDuration: 30000
    });
    
    // Configurar tratamento de erros para o worker
    worker.on('failed', (job: Job, error: Error) => {
      logger.error(`Job ${job.id} falhou: ${error.message}`, {
        jobId: job.id,
        error: error.message,
        eventName: job.data.eventName,
        eventId: job.data.serverData?.event_id,
        attempts: job.attemptsMade
      });
    });
    
    worker.on('completed', (job: Job) => {
      logger.debug(`Job ${job.id} concluído com sucesso`, {
        jobId: job.id,
        eventName: job.data.eventName,
        eventId: job.data.serverData?.event_id
      });
    });
    
    logger.info('Fila de eventos inicializada com sucesso');
  } catch (error: any) {
    logger.error(`Erro ao inicializar fila de eventos: ${error.message}`, { error: error.message });
    throw error;
  }
};

/**
 * Adiciona um evento à fila para processamento assíncrono
 * @param {NormalizedEvent} event - Evento normalizado
 * @returns {Promise<void>}
 */
export const addEventToQueue = async (event: NormalizedEvent): Promise<void> => {
  try {
    if (!eventQueue) {
      throw new Error('Fila não inicializada');
    }
    
    // Adicionar evento à fila
    const job = await eventQueue.add('processEvent', event, {
      jobId: event.serverData.event_id // Usar event_id como job_id para evitar duplicações
    });
    
    logger.info(`Evento adicionado à fila: ${event.eventName} (ID: ${job.id})`);
  } catch (error: any) {
    // Se o erro for de duplicação, não é um problema crítico
    if (error.message.includes('duplicate')) {
      logger.info(`Evento já existe na fila: ${event.eventName} (ID: ${event.serverData.event_id})`);
      return;
    }
    
    logger.error(`Erro ao adicionar evento à fila: ${error.message}`, {
      error: error.message,
      eventName: event.eventName,
      eventId: event.serverData.event_id
    });
    
    throw error;
  }
};

export { eventQueue }; 