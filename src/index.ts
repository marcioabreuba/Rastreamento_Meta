/**
 * Ponto de entrada da aplicação
 */

import './app';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import logger from './utils/logger';
import config from './config';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from 'express-rate-limit';
import path from 'path';

// Inicializar o servidor Express
const app = express();

// Configurar a porta
const PORT = process.env.PORT || 3000;

// Conectar ao banco de dados
const prisma = new PrismaClient();

// Middlewares de segurança e otimização
app.use(compression()); // Comprimir respostas
app.use(helmet({ contentSecurityPolicy: false })); // Cabeçalhos de segurança
app.use(cors()); // Habilitar CORS para todas as origens
app.use(express.json()); // Parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Parsear URL-encoded no corpo

// Limitar taxa de requisições por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // limite de 500 requisições por IP
  standardHeaders: true, // Incluir info no cabeçalho `RateLimit-*`
  legacyHeaders: false, // Desabilitar cabeçalhos `X-RateLimit-*`
  message: 'Muitas requisições desse IP, tente novamente mais tarde',
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' // Não aplicar a localhost
});
app.use(limiter);

// Logger de requisições
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Usar as rotas da API
app.use('/', routes);

// Iniciar o servidor
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Manipulação de exceções não tratadas
process.on('uncaughtException', (error) => {
  logger.error('Exceção não tratada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promessa rejeitada não tratada:', { reason, promise });
});

export default app; 