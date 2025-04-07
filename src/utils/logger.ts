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

// Definir formato para o log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
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
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

export default logger; 