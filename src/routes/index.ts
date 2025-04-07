/**
 * Definição das rotas da aplicação
 */

import { Router } from 'express';
import { trackEvent, getPixelCode, getStatus } from '../controllers/eventController';
import config from '../config';

const router = Router();

// Rotas de rastreamento
router.post('/track', trackEvent);
router.post('/pixel-code', getPixelCode);
router.get('/pixel-code', (req, res) => {
  res.status(200).send(`
    <!-- Meta Pixel Code Base -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${config.fbPixelId}');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${config.fbPixelId}&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->
  `);
});

// Rota de status
router.get('/status', getStatus);

// Rota padrão
router.get('/', (req, res) => {
  res.json({
    message: 'Meta Tracking API',
    version: '1.0.0',
    endpoints: [
      { method: 'POST', path: '/track', description: 'Rastreia um evento' },
      { method: 'POST', path: '/pixel-code', description: 'Gera código do pixel para um evento' },
      { method: 'GET', path: '/pixel-code', description: 'Retorna o código base do pixel' },
      { method: 'GET', path: '/status', description: 'Retorna o status do servidor' },
    ],
  });
});

export default router; 