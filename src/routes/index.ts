/**
 * Definição das rotas da aplicação
 */

import express from 'express';
import { handleTrackRequest } from '../App/Http/TrackController';
import config from '../config';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Rota Principal de Rastreamento
router.post('/track', handleTrackRequest);

// Rota para servir o código do pixel (script completo + inicialização)
router.get('/pixel-code', (req, res) => {
  // Ler o arquivo do script completo
  const scriptPath = path.join(__dirname, '../public/meta-pixel-script.js');
  
  try {
    const pixelScript = fs.existsSync(scriptPath) 
      ? fs.readFileSync(scriptPath, 'utf8')
      : '';

    res.status(200).send(`
    <!-- Meta Pixel Code Completo com Advanced Matching -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    // Configuração do pixel com Advanced Matching completo
    const pixelParams = {
      external_id: localStorage.getItem('meta_tracking_external_id') || 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15),
      // Outros parâmetros serão adicionados pelo script completo
    };
    
    // Inicializar com Advanced Matching
    fbq('init', '${config.fbPixelId}', pixelParams);
    fbq('track', 'PageView');
    </script>
    
    <!-- Script completo de rastreamento melhorado -->
    <script>
    ${pixelScript}
    </script>
    
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${config.fbPixelId}&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->
  `);
  } catch (error) {
    console.error('Erro ao ler o arquivo do script:', error);
    
    // Fallback para o código básico do pixel
    res.status(200).send(`
      <!-- Meta Pixel Code Base (Fallback) -->
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
  }
});

// Rota padrão (simplificada)
router.get('/', (req, res) => {
  res.json({
    message: 'Meta Tracking API - Refactored',
    version: '2.0.0',
    endpoints: [
      { method: 'POST', path: '/track', description: 'Rastreia um evento via CAPI.' },
      { method: 'GET', path: '/pixel-code', description: 'Retorna o código HTML/JS para instalação do pixel.' },
    ],
  });
});

export default router; 