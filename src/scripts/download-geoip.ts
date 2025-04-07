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
 * Baixa e extrai o banco de dados GeoIP
 */
async function downloadGeoIPDatabase(): Promise<boolean> {
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
    
    // Limpar arquivos temporários
    fs.rmSync(tempFile, { force: true });
    fs.rmSync(path.join(path.dirname(TEMP_DIR), extractedDir), { recursive: true, force: true });
    logger.info('Arquivos temporários removidos');
    
    return true;
  } catch (error: any) {
    logger.error(`Erro durante o download e extração: ${error.message}`, { error: error.message });
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