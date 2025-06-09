/**
 * Middleware para validação centralizada de dados de entrada
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { isValidEmail, isValidBrazilianPhone } from '../utils/validators';
import config from '../config';

/**
 * Interface para dados de validação
 */
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Middleware de validação para eventos de rastreamento
 */
export const validateTrackingEvent = (req: Request, res: Response, next: NextFunction): void => {
  const errors: ValidationError[] = [];
  const { eventName, userData, customData } = req.body;

  // Validar eventName obrigatório
  if (!eventName || typeof eventName !== 'string' || eventName.trim() === '') {
    errors.push({
      field: 'eventName',
      message: 'Event name is required and must be a non-empty string',
      value: eventName
    });
  }

  // Validações opcionais de userData
  if (userData) {
    // Validar email se fornecido
    if (userData.email && !isValidEmail(userData.email)) {
      errors.push({
        field: 'userData.email',
        message: 'Invalid email format',
        value: userData.email
      });
    }

    // Validar telefone brasileiro se fornecido
    if (userData.phone && !isValidBrazilianPhone(userData.phone)) {
      errors.push({
        field: 'userData.phone',
        message: 'Invalid Brazilian phone format',
        value: userData.phone
      });
    }

    // Validar tipos de dados básicos
    if (userData.firstName && typeof userData.firstName !== 'string') {
      errors.push({
        field: 'userData.firstName',
        message: 'First name must be a string',
        value: userData.firstName
      });
    }

    if (userData.lastName && typeof userData.lastName !== 'string') {
      errors.push({
        field: 'userData.lastName',
        message: 'Last name must be a string',
        value: userData.lastName
      });
    }
  }

  // Validações opcionais de customData
  if (customData) {
    // Validar value se fornecido
    if (customData.value !== undefined && customData.value !== null) {
      const numValue = Number(customData.value);
      if (isNaN(numValue) || numValue < 0) {
        errors.push({
          field: 'customData.value',
          message: 'Value must be a valid positive number',
          value: customData.value
        });
      }
    }

    // Validar currency se fornecido
    if (customData.currency && (typeof customData.currency !== 'string' || customData.currency.length !== 3)) {
      errors.push({
        field: 'customData.currency',
        message: 'Currency must be a 3-letter ISO code',
        value: customData.currency
      });
    }
  }

  // Se há erros de validação críticos, retornar erro
  const criticalErrors = errors.filter(e => e.field === 'eventName');
  if (criticalErrors.length > 0) {
    logger.warn('[ValidationMiddleware] Critical validation errors detected', { 
      errors: criticalErrors,
      body: req.body 
    });
    
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: criticalErrors.map(e => ({ field: e.field, message: e.message }))
    });
    return;
  }

  // Para erros não críticos, apenas logar como warning e continuar
  if (errors.length > 0) {
    logger.warn('[ValidationMiddleware] Non-critical validation warnings', { 
      errors,
      body: req.body 
    });
    
    // Adicionar warnings ao request para o controller usar se necessário
    (req as any).validationWarnings = errors;
  }

  next();
};

/**
 * Middleware de sanitização de dados
 */
export const sanitizeData = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body) {
    // Remover propriedades com valores null ou undefined vazios
    function cleanObject(obj: any): any {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
          if (typeof obj[key] === 'object') {
            const cleanedNested = cleanObject(obj[key]);
            if (Object.keys(cleanedNested).length > 0) {
              cleaned[key] = cleanedNested;
            }
          } else {
            cleaned[key] = obj[key];
          }
        }
      }
      return cleaned;
    }

    req.body = cleanObject(req.body);
  }

  next();
};

/**
 * Middleware de rate limiting básico por IP
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
  const now = Date.now();
  const { windowMs, maxRequestsPerWindow } = config.rateLimit;
  
  // Limpar contadores expirados
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
  
  // Verificar limite atual
  const currentData = requestCounts.get(clientIp);
  
  if (!currentData) {
    // Primeira requisição desta janela
    requestCounts.set(clientIp, {
      count: 1,
      resetTime: now + windowMs
    });
  } else {
    // Incrementar contador
    currentData.count++;
    
    if (currentData.count > maxRequestsPerWindow) {
      logger.warn(`[RateLimit] Rate limit exceeded for IP ${clientIp}`, {
        count: currentData.count,
        limit: maxRequestsPerWindow,
        resetTime: new Date(currentData.resetTime).toISOString()
      });
      
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((currentData.resetTime - now) / 1000)
      });
      return;
    }
  }
  
  // Adicionar headers informativos
  res.setHeader('X-RateLimit-Limit', maxRequestsPerWindow);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequestsPerWindow - (currentData?.count || 1)));
  res.setHeader('X-RateLimit-Reset', new Date(currentData?.resetTime || now + windowMs).toISOString());
  
  next();
}; 