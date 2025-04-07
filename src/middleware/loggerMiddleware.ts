/**
 * Middleware para logging de requisições HTTP
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Registra informações sobre requisições HTTP
 * @param {Request} req - Requisição
 * @param {Response} res - Resposta
 * @param {NextFunction} next - Função next
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = new Date().getTime();
  
  // Capturar dados da requisição
  const { method, originalUrl } = req;
  
  // Extrair IP preferindo IPv4
  let ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  if (ip && ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }
  
  // Interceptar resposta para capturar o status code
  const originalSend = res.send;
  res.send = function (body: any): Response {
    const end = new Date().getTime();
    const responseTime = end - start;
    
    // Registrar informações da requisição/resposta
    logger.http(`${method} ${originalUrl} ${res.statusCode} - ${responseTime}ms`, {
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      responseTime,
      ip,
      userAgent: req.get('user-agent') || '',
    });
    
    // Chamar o método original
    return originalSend.call(this, body);
  };
  
  next();
}; 