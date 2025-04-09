/**
 * Serviço de logging estruturado usando Winston
 */

import winston from 'winston';
import config from '../config';

// Definir níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir cores para cada nível de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Configurar cores para os níveis
winston.addColors(colors);

// Formato detalhado para logs com metadados
const detailedFormat = winston.format.printf((info) => {
  // Extrair message e timestamp, o resto são metadados
  const { timestamp, level, message, ...metadata } = info;
  
  // Formatar mensagem básica
  let logMessage = `${timestamp} ${level}: ${message}`;
  
  // Adicionar metadados se existirem
  if (Object.keys(metadata).length > 0) {
    try {
      // Tentar formatar metadados como JSON
      logMessage += ` | ${JSON.stringify(metadata)}`;
    } catch (e) {
      // Fallback para toString em caso de erro de serialização
      logMessage += ` | [Metadata: serialization error]`;
    }
  }
  
  return logMessage;
});

// Definir formato para o log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  detailedFormat
);

// Definir transportes para os logs
const transports = [
  // Console para todos os logs
  new winston.transports.Console(),
  
  // Arquivo para logs de erros
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // Arquivo para todos os logs
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Criar uma instância do logger
const logger = winston.createLogger({
  level: config.logLevel, // Usar logLevel da configuração
  levels,
  format,
  transports,
});

export default logger; 