import { Router } from 'express';
import { ServerTrackController } from '../App/Controller/ServerTrackController';
import { FbclidCaptureMiddleware } from '../App/Middleware/FbclidCaptureMiddleware';

const router = Router();

/**
 * Rotas para Server-Side Tracking (Backup)
 * Funcionam quando JavaScript está desabilitado ou bloqueado
 */

// Middleware para capturar fbclid automaticamente
router.use(FbclidCaptureMiddleware.capture);

// Endpoint principal: pixel transparente para tracking
router.get('/pixel', ServerTrackController.trackServerSide);

// Endpoint alternativo para POSTs
router.post('/event', ServerTrackController.trackFormSubmit);

// Health check
router.get('/health', ServerTrackController.healthCheck);

export default router; 