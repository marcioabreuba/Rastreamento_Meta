/**
 * Ponto de entrada da aplicação
 */

import { app } from './app';
import logger from './utils/logger';
import { Reader } from '@maxmind/geoip2-node';
import * as GeoIPService from './App/Core/GeoIPService';
import config from './config';
import fs from 'fs';

const PORT = config.port || 10000;

// Função assíncrona para inicializar todos os componentes antes de iniciar o servidor
const startServer = async () => {
  try {
    // Inicializar o serviço GeoIP (com tratamento robusto de erros)
    try {
      logger.info(`🔍 Procurando GeoIP em: ${config.geoipDbPath}`);
      logger.info(`📁 Working directory: ${process.cwd()}`);
      logger.info(`📁 __dirname: ${__dirname}`);
      
      if (fs.existsSync(config.geoipDbPath)) {
          logger.info('✅ Arquivo GeoIP encontrado! Tentando carregar...');
          const stats = fs.statSync(config.geoipDbPath);
          logger.info(`📊 Tamanho do arquivo: ${Math.round(stats.size / 1024 / 1024)}MB`);
          
          const geoipReader = await Reader.open(config.geoipDbPath);
          GeoIPService.setGeoIPReaderInstance(geoipReader);
          logger.info('✅ Banco de dados GeoIP carregado e injetado no GeoIPService.');
      } else {
          logger.warn(`❌ Banco de dados GeoIP não encontrado em: ${config.geoipDbPath}`);
          logger.info('📂 Conteúdo do diretório atual:');
          try {
            const files = fs.readdirSync(process.cwd());
            logger.info(`Arquivos em ${process.cwd()}: ${files.join(', ')}`);
            if (fs.existsSync('data')) {
              const dataFiles = fs.readdirSync('data');
              logger.info(`Arquivos em data/: ${dataFiles.join(', ')}`);
            }
          } catch (e) {
            logger.warn('Erro ao listar arquivos:', e);
          }
      }
    } catch (geoipError: any) {
      logger.warn('⚠️  Erro ao carregar GeoIP (continuando sem GeoIP):', {
        error: geoipError.message,
        path: config.geoipDbPath
      });
      // Remove arquivo corrompido se existir
      if (fs.existsSync(config.geoipDbPath)) {
        try {
          fs.unlinkSync(config.geoipDbPath);
          logger.info('🗑️  Arquivo GeoIP corrompido removido. Será baixado novamente no próximo build.');
        } catch (unlinkError) {
          logger.warn('Não foi possível remover arquivo GeoIP corrompido:', unlinkError);
        }
      }
    }

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