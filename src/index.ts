/**
 * Ponto de entrada da aplicação
 */

import { app } from './app';
import logger from './utils/logger';
import { initGeoIP } from './utils/geoip';
import { initQueue } from './utils/queue';
import config from './config';

const PORT = config.port || 10000;

// Função assíncrona para inicializar todos os componentes antes de iniciar o servidor
const startServer = async () => {
  try {
    // Inicializar a fila de eventos
    await initQueue();
    
    // Inicializar o serviço GeoIP
    await initGeoIP();
    
    // Iniciar o servidor HTTP
    app.listen(PORT, () => {
      logger.info(`Servidor rodando na porta ${PORT}`);
      logger.info(`Ambiente: ${config.nodeEnv}`);
    });
  } catch (error: any) {
    logger.error(`Erro ao iniciar o servidor: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Iniciar o servidor
startServer(); 