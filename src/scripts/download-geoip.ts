/**
 * Script para baixar e extrair o banco de dados GeoIP do MaxMind
 */

import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import config from '../config';
import logger from '../utils/logger';

const streamPipeline = promisify(pipeline);
const execPromise = promisify(exec);

// Caminho para o banco de dados GeoIP
const GEOIP_DB_PATH = config.geoipDbPath;
const TEMP_DIR = path.join(process.cwd(), 'data', 'temp');
const BACKUP_DB_PATH = path.join(process.cwd(), 'data', 'backup', 'GeoLite2-City.mmdb');

// URL para download do banco de dados GeoLite2 City
const DOWNLOAD_URL = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${config.maxmindLicenseKey}&suffix=tar.gz`;

/**
 * Garante que o diretório exista
 * @param {string} filePath - Caminho do arquivo
 */
function ensureDirectoryExists(filePath: string): boolean {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname);
  return true;
}

/**
 * Verifica se o arquivo GeoIP já existe
 */
function checkExistingGeoIP(): boolean {
  return fs.existsSync(GEOIP_DB_PATH);
}

/**
 * Verifica se existe um backup do banco GeoIP
 */
function checkBackupGeoIP(): boolean {
  return fs.existsSync(BACKUP_DB_PATH);
}

/**
 * Usa o arquivo de backup se disponível
 */
function useBackupGeoIP(): boolean {
  try {
    if (checkBackupGeoIP()) {
      // Garantir que o diretório de destino exista
      ensureDirectoryExists(GEOIP_DB_PATH);
      
      // Copiar o backup para o destino
      fs.copyFileSync(BACKUP_DB_PATH, GEOIP_DB_PATH);
      logger.info(`Utilizando arquivo de backup do GeoIP em ${BACKUP_DB_PATH}`);
      return true;
    }
    return false;
  } catch (error: any) {
    logger.error(`Erro ao utilizar arquivo de backup: ${error.message}`);
    return false;
  }
}

/**
 * Baixa e extrai o banco de dados GeoIP
 */
async function downloadGeoIPDatabase(): Promise<boolean> {
  // Verificar se o arquivo já existe e está atualizado
  if (checkExistingGeoIP()) {
    const stats = fs.statSync(GEOIP_DB_PATH);
    const fileAgeInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    
    // Se o arquivo tiver menos de 30 dias, usa o existente
    if (fileAgeInDays < 30) {
      logger.info(`Banco de dados GeoIP existente encontrado e é recente (${Math.round(fileAgeInDays)} dias)`);
      return true;
    }
    
    logger.info(`Banco de dados GeoIP existente encontrado mas está desatualizado (${Math.round(fileAgeInDays)} dias)`);
  }
  
  logger.info('Iniciando download do banco de dados GeoIP...');
  
  // Garantir que os diretórios existam
  ensureDirectoryExists(GEOIP_DB_PATH);
  ensureDirectoryExists(path.join(TEMP_DIR, 'placeholder'));
  
  // Nome do arquivo temporário
  const tempFile = path.join(TEMP_DIR, 'geoip.tar.gz');
  
  try {
    // Baixar o arquivo
    logger.info(`Baixando de ${DOWNLOAD_URL}...`);
    const response = await fetch(DOWNLOAD_URL);
    
    if (!response.ok) {
      logger.error(`Erro ao baixar o banco de dados GeoIP: ${response.statusText}`);
      
      // Se o download falhar, tentar usar backup
      if (useBackupGeoIP()) {
        return true;
      }
      
      // Se mesmo o backup falhar, verificar se existe o arquivo atual
      if (checkExistingGeoIP()) {
        logger.info('Utilizando banco de dados GeoIP existente devido a falha no download');
        return true;
      }
      
      throw new Error(`Erro ao baixar o banco de dados GeoIP: ${response.statusText}`);
    }
    
    // Salvar o arquivo .tar.gz
    const fileStream = createWriteStream(tempFile);
    await streamPipeline(response.body, fileStream);
    logger.info(`Arquivo baixado para ${tempFile}`);
    
    // Extrair o arquivo usando tar
    logger.info('Extraindo arquivo...');
    await execPromise(`tar -xzf ${tempFile} -C ${path.dirname(TEMP_DIR)}`);
    
    // Encontrar o arquivo .mmdb extraído
    const extractedDir = fs.readdirSync(path.dirname(TEMP_DIR))
      .filter(file => file.startsWith('GeoLite2-City_') && fs.statSync(path.join(path.dirname(TEMP_DIR), file)).isDirectory())[0];
    
    if (!extractedDir) {
      throw new Error('Não foi possível encontrar o diretório extraído');
    }
    
    const mmdbFile = path.join(path.dirname(TEMP_DIR), extractedDir, 'GeoLite2-City.mmdb');
    
    // Mover o arquivo para o destino final
    fs.copyFileSync(mmdbFile, GEOIP_DB_PATH);
    logger.info(`Banco de dados GeoIP extraído e movido para ${GEOIP_DB_PATH}`);
    
    // Criar diretório de backup se não existir
    ensureDirectoryExists(BACKUP_DB_PATH);
    
    // Salvar como backup para uso futuro
    fs.copyFileSync(mmdbFile, BACKUP_DB_PATH);
    logger.info(`Criado backup do banco de dados GeoIP em ${BACKUP_DB_PATH}`);
    
    // Limpar arquivos temporários
    fs.rmSync(tempFile, { force: true });
    fs.rmSync(path.join(path.dirname(TEMP_DIR), extractedDir), { recursive: true, force: true });
    logger.info('Arquivos temporários removidos');
    
    return true;
  } catch (error: any) {
    logger.error(`Erro durante o download e extração: ${error.message}`, { error: error.message });
    
    // Se o download falhar, tentar usar backup
    if (useBackupGeoIP()) {
      return true;
    }
    
    // Se mesmo o backup falhar, verificar se existe o arquivo atual
    if (checkExistingGeoIP()) {
      logger.info('Utilizando banco de dados GeoIP existente devido a falha no download');
      return true;
    }
    
    return false;
  }
}

// Se executado diretamente (não importado como módulo)
if (require.main === module) {
  downloadGeoIPDatabase()
    .then(success => {
      if (success) {
        logger.info('Download e extração concluídos com sucesso!');
        process.exit(0);
      } else {
        logger.error('Falha no download ou extração.');
        process.exit(1);
      }
    })
    .catch((error: any) => {
      logger.error(`Erro: ${error.message}`, { error: error.message });
      process.exit(1);
    });
}

export { downloadGeoIPDatabase }; 