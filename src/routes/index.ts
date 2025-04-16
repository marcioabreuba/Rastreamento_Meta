/**
 * Definição das rotas da aplicação
 */

import express, { Request, Response } from 'express';
import { handleTrackRequest } from '../App/Http/TrackController';
import config from '../config';
import fs from 'fs';
import path from 'path';
import * as GeoIPService from '../App/Core/GeoIPService';
import { GeoData } from '../types';
import logger from '../utils/logger';

const router = express.Router();

// Nova Rota para servir o script dinamicamente com GeoIP injetado
router.get('/meta-pixel-script.js', async (req: Request, res: Response) => {
  const scriptPath = path.join(__dirname, '../public/meta-pixel-script.js');

  try {
    if (!fs.existsSync(scriptPath)) {
      logger.error(`[GeoScript] Arquivo de script não encontrado: ${scriptPath}`);
      return res.status(404).send('// Script not found.');
    }

    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    let geoData: GeoData | null = null;

    // Obter GeoIP
    const ip = req.ip;
    if (ip) {
        try {
            geoData = await GeoIPService.getGeoData(ip);
        } catch (geoError: any) {
            logger.warn(`[GeoScript] Erro ao obter GeoIP para ${ip}: ${geoError.message}`);
            // Continuar sem dados GeoIP
        }
    } else {
        logger.warn('[GeoScript] Não foi possível obter o IP do requisitante.');
    }

    // Substituir placeholders
    // Usar `?? null` para garantir que null seja injetado se o dado não existir
    // Usar JSON.stringify para lidar corretamente com strings e null
    scriptContent = scriptContent.replace(/['"`]?__GEO_CITY__['"`]?/g, JSON.stringify(geoData?.city ?? null));
    scriptContent = scriptContent.replace(/['"`]?__GEO_STATE__['"`]?/g, JSON.stringify(geoData?.region?.code?.toLowerCase() ?? null)); // Garantir lowercase
    scriptContent = scriptContent.replace(/['"`]?__GEO_ZIP__['"`]?/g, JSON.stringify(geoData?.postal ?? null)); // Já normalizado no GeoIPService
    scriptContent = scriptContent.replace(/['"`]?__GEO_COUNTRY__['"`]?/g, JSON.stringify(geoData?.country?.code?.toLowerCase() ?? null)); // Garantir lowercase

    // Enviar script modificado
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.status(200).send(scriptContent);

  } catch (error: any) {
    logger.error(`[GeoScript] Erro ao servir o script dinâmico: ${error.message}`, { stack: error.stack });
    res.status(500).send('// Error processing script.');
  }
});

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