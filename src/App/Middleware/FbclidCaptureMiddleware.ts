import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

// Extend Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      fbclid?: string;
      fbclidCaptureTime?: number;
      fbclidSourceUrl?: string;
      fbclidUserAgent?: string;
      fbclidClientIp?: string;
      [key: string]: any;
    };
    sessionID?: string;
  }
}

/**
 * Middleware para capturar fbclid automaticamente em todas as requisições
 * Funciona como backup quando JavaScript está desabilitado ou bloqueado
 */
export class FbclidCaptureMiddleware {
  
  /**
   * Middleware principal que captura fbclid de qualquer URL
   */
  static capture(req: Request, res: Response, next: NextFunction): void {
    try {
      const fbclid = req.query.fbclid as string;
      const userAgent = req.get('User-Agent') || '';
      const clientIp = req.ip || req.connection.remoteAddress || '';
      const sourceUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      // Se encontrou fbclid, processar
      if (fbclid && fbclid.trim().length > 10) {
        logger.info(`[FbclidCapture] 🎯 FBCLID detectado no servidor: ${fbclid.substring(0, 20)}...`, {
          sourceUrl,
          userAgent: userAgent.substring(0, 50) + '...',
          clientIp,
          timestamp: new Date().toISOString()
        });

        // Armazenar dados na sessão para uso posterior
        if (req.session) {
          req.session.fbclid = fbclid;
          req.session.fbclidCaptureTime = Date.now();
          req.session.fbclidSourceUrl = sourceUrl;
          req.session.fbclidUserAgent = userAgent;
          req.session.fbclidClientIp = clientIp;
          
          logger.debug(`[FbclidCapture] 💾 FBCLID armazenado na sessão`, {
            sessionId: req.sessionID,
            fbclid: fbclid.substring(0, 20) + '...'
          });
        }

        // Marcar que temos fbclid para scripts subsequentes
        res.locals.hasFbclid = true;
        res.locals.fbclid = fbclid;
        res.locals.serverTracking = {
          fbclid,
          captureTime: Date.now(),
          sourceUrl,
          userAgent,
          clientIp
        };
      }
      
      next();
    } catch (error) {
      logger.error('[FbclidCapture] Erro no middleware de captura:', error);
      next(); // Continuar mesmo com erro
    }
  }

  /**
   * Middleware para injetar pixel de tracking server-side
   */
  static injectTrackingPixel(req: Request, res: Response, next: NextFunction): void {
    if (res.locals.hasFbclid) {
      // Adicionar pixel invisível para tracking server-side
      const originalSend = res.send;
      
      res.send = function(data: any) {
        if (typeof data === 'string' && data.includes('</body>')) {
          const fbclid = res.locals.fbclid;
          const trackingPixel = `
<!-- Server-Side Facebook Tracking Backup -->
<img src="/server-track/pixel?fbclid=${encodeURIComponent(fbclid)}&t=${Date.now()}" 
     style="display:none;width:1px;height:1px;" 
     alt="" 
     onload="console.log('[Server Tracking] Pixel backup carregado')"
     onerror="console.log('[Server Tracking] Pixel backup falhou')" />
<script>
  // Backup notification
  if (typeof window.fbq === 'undefined') {
    console.log('[Server Tracking] 🛡️ JavaScript tracking indisponível - usando backup server-side');
  }
</script>
</body>`;
          
          data = data.replace('</body>', trackingPixel);
        }
        
        return originalSend.call(this, data);
      };
    }
    
    next();
  }
} 