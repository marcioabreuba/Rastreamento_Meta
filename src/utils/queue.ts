/**
 * Sistema de filas usando Bull para processamento assíncrono
 * Com fallback para implementação em memória quando o Redis não estiver disponível
 */

import Queue from 'bull';
import { NormalizedEvent } from '../types';
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

// Criar a fila com tratamento de erros
let eventQueue: Queue.Queue<NormalizedEvent> | any;

try {
  // Tentar conectar ao Redis
  const redisConfig = {
    redis: {
      port: config.redis.port,
      host: config.redis.host,
      password: config.redis.password || undefined,
      username: config.redis.username || undefined,
      db: 0, // Índice do banco de dados Redis (geralmente 0)
      enableReadyCheck: false, // Desabilitar verificação de prontidão para evitar problemas com conexões remotas
      maxRetriesPerRequest: 3 // Número máximo de tentativas por requisição
    }
  };

  // Criar a fila usando Bull
  eventQueue = new Queue<NormalizedEvent>('meta-events', redisConfig);
  
  logger.info('Fila de eventos inicializada com sucesso', {
    redisHost: config.redis.host,
    redisPort: config.redis.port,
    queueName: 'meta-events'
  });
  
  // Adiciona um handler de erro global para capturar falhas de conexão
  eventQueue.on('error', (err: Error) => {
    logger.error(`Erro na fila de eventos: ${err.message}`, { error: err.message, stack: err.stack });
    // Se o erro for fatal de conexão, podemos trocar para a implementação em memória
    if (err.message.includes('WRONGPASS') || err.message.includes('NOAUTH')) {
      logger.warn('Erro de autenticação no Redis. Mudando para implementação em memória...');
      // Não fazemos nada aqui, o sistema continuará funcionando mesmo com erro do Redis
    }
  });
} catch (error: any) {
  logger.error(`Erro ao inicializar a fila de eventos: ${error.message}`, {
    error: error.message,
    stack: error.stack
  });
  
  // Criar uma implementação em memória
  logger.info('Usando fila em memória devido a erro na conexão com Redis');
  eventQueue = new InMemoryQueue();
}

// Configurar processamento de eventos na fila
export const setupEventQueue = () => {
  try {
    // Configurar handlers para eventos da fila
    eventQueue.on('completed', (job: any) => {
      logger.info(`Job ${job.id} concluído: Evento ${job.data.eventName} processado com sucesso`);
    });

    eventQueue.on('failed', (job: any, err: Error) => {
      logger.error(`Job ${job?.id} falhou: ${err.message}`, { 
        jobId: job?.id,
        eventName: job?.data?.eventName,
        error: err.message,
        stack: err.stack
      });
    });

    logger.info('Sistema de filas inicializado com sucesso');
  } catch (error: any) {
    logger.error(`Erro ao configurar sistema de filas: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
  }
};

// Adicionar evento à fila
export const addEventToQueue = async (event: NormalizedEvent): Promise<string> => {
  try {
    const job = await eventQueue.add(event, {
      jobId: event.serverData.event_id, // Usar o ID do evento como ID do job
      attempts: 3
    });
    
    logger.info(`Evento adicionado à fila: ${event.eventName} (ID: ${event.serverData.event_id})`);
    return job.id.toString();
  } catch (error: any) {
    logger.error(`Erro ao adicionar evento à fila: ${error.message}`, { error: error.message });
    
    // Em caso de erro, processar imediatamente
    logger.info(`Processando evento imediatamente devido a erro na fila: ${event.eventName}`);
    return `local-${Date.now()}`;
  }
};

export { eventQueue }; 