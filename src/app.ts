/**
 * Arquivo principal da aplicação
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import routes from './routes';
import config from './config';
import { initGeoIP } from './utils/geoip';
import { setupEventQueue, eventQueue } from './utils/queue';
import { processQueuedEvent } from './services/eventService';
import logger from './utils/logger';
import { httpLogger } from './middleware/loggerMiddleware';
import Queue from 'bull';
import { NormalizedEvent } from './types';

// Inicializar aplicação Express
const app = express();

// Configurar para preferir IPv4
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(httpLogger);

// Configurar rotas
app.use('/', routes);

// Inicializar GeoIP
const initializeApp = async () => {
  try {
    // Inicializar GeoIP
    const geoipInitialized = await initGeoIP();
    if (geoipInitialized) {
      logger.info('GeoIP inicializado com sucesso');
    } else {
      logger.warn('GeoIP não inicializado. Algumas funcionalidades de geolocalização podem não estar disponíveis.');
    }
    
    // Configurar processador de fila de eventos
    setupEventQueue();
    
    // Configurar processamento de eventos na fila
    eventQueue.process(async (job: Queue.Job<NormalizedEvent>, done: Queue.DoneCallback) => {
      try {
        logger.info(`Processando evento da fila: ${job.data.eventName}`, { 
          eventId: job.data.serverData.event_id,
          jobId: job.id
        });
        
        const result = await processQueuedEvent(job.data);
        
        if (result) {
          logger.info(`Evento processado com sucesso: ${job.data.eventName}`, { 
            eventId: job.data.serverData.event_id,
            jobId: job.id
          });
          done(null, result);
        } else {
          const error = new Error(`Falha ao processar evento: ${job.data.eventName}`);
          logger.error(error.message, { 
            eventId: job.data.serverData.event_id,
            jobId: job.id
          });
          done(error);
        }
      } catch (error: any) {
        logger.error(`Erro no processamento do evento: ${error.message}`, {
          error: error.message,
          eventName: job.data.eventName,
          eventId: job.data.serverData.event_id,
          jobId: job.id
        });
        done(error);
      }
    });
    
    // Iniciar servidor
    app.listen(config.port, () => {
      logger.info(`Servidor rodando na porta ${config.port}`);
      logger.info(`Ambiente: ${config.nodeEnv}`);
    });
  } catch (error: any) {
    logger.error(`Erro ao inicializar aplicação: ${error.message}`, { error: error.message });
    process.exit(1);
  }
};

// Inicializar aplicação
initializeApp();

export default app; 