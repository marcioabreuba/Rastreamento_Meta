/**
 * Definição das rotas da aplicação
 */

import express, { Request, Response } from 'express';
import { handleTrackRequest } from '../App/Http/TrackController';
import config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import * as GeoIPService from '../App/Core/GeoIPService';
import { GeoData } from '../types';
import logger from '../utils/logger';
import { validateTrackingEvent, sanitizeData, rateLimitMiddleware } from '../middleware/validationMiddleware';
import { promisify } from 'util';

const router = express.Router();
const readFileAsync = promisify(fs.readFile);

// Nova Rota para servir o script dinamicamente com headers anti-cache
router.get('/meta-pixel-script.js', async (req: Request, res: Response) => {
  try {
    // +++ HEADERS ANTI-CACHE PARA FORÇAR RECARREGAMENTO +++
    const currentTimestamp = Date.now();
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date(currentTimestamp).toUTCString(),
      'ETag': `"${currentTimestamp}"`,
      'X-Script-Version': currentTimestamp.toString(),
      'Vary': 'Accept-Encoding'
    });

    // +++ OBTER DADOS GEOIP PARA INJEÇÃO NO SCRIPT +++
    const ipHeader = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const ip = typeof ipHeader === 'string' ? ipHeader.split(',')[0].trim() : null;
    let geoData: any = null;

    if (ip) {
      try {
        geoData = await GeoIPService.getGeoData(ip);
        logger.debug(`[GeoScript] GeoIP data for ${ip}:`, geoData);
      } catch (geoError: any) {
        logger.warn(`[GeoScript] Erro ao obter GeoIP para ${ip}: ${geoError.message}`);
      }
    }

    // Lê o script base
    const scriptPath = path.join(__dirname, '../public/meta-pixel-script.js');
    const pixelScript = await readFileAsync(scriptPath, 'utf8');
    
    // +++ ADICIONAR TIMESTAMP/VERSÃO E DADOS GEOIP NO INÍCIO DO SCRIPT +++
    const versionComment = `// Meta Tracking Script v${currentTimestamp} - Generated: ${new Date().toISOString()}\n`;
    const versionLog = `console.log('[Meta Tracking] Script v${currentTimestamp} carregado - ${new Date().toISOString()}');\n`;
    
    // Gerar script GeoIP com dados atuais
    const geoInjection = `
// --- GeoIP Data Injection ---
window.__GEO_DATA__ = {
  city: ${JSON.stringify(geoData?.city ?? null)},
  state: ${JSON.stringify(geoData?.region?.code?.toLowerCase() ?? null)},
  zip: ${JSON.stringify(geoData?.postal ?? null)},
  country: ${JSON.stringify(geoData?.country?.code?.toLowerCase() ?? null)},
  ip: ${JSON.stringify(ip ?? null)}
};
`;
    
    // Substituir placeholders no script original
    let processedScript = pixelScript
      .replace(/['"`]?__GEO_CITY__['"`]?/g, JSON.stringify(geoData?.city ?? null))
      .replace(/['"`]?__GEO_STATE__['"`]?/g, JSON.stringify(geoData?.region?.code?.toLowerCase() ?? null))
      .replace(/['"`]?__GEO_ZIP__['"`]?/g, JSON.stringify(geoData?.postal ?? null))
      .replace(/['"`]?__GEO_COUNTRY__['"`]?/g, JSON.stringify(geoData?.country?.code?.toLowerCase() ?? null))
      .replace(/['"`]?__CLIENT_IP__['"`]?/g, JSON.stringify(ip ?? null));
    
    // Combina tudo
    const combinedScript = versionComment + versionLog + geoInjection + '\n\n' + processedScript;

    res.send(combinedScript);
  } catch (error) {
    console.error('Erro ao servir meta-pixel-script.js:', error);
    res.status(500).send('// Erro ao carregar script');
  }
});

// Rota Principal de Rastreamento com middlewares
router.post('/track', 
  rateLimitMiddleware,
  sanitizeData,
  validateTrackingEvent,
  handleTrackRequest
);

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
  } catch (error: any) {
    logger.error('Erro ao ler o arquivo do script:', error);
    
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