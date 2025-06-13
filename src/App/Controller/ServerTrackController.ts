import { Request, Response } from 'express';
import logger from '../../utils/logger';
import * as GeoIPService from '../Core/GeoIPService';
import { normalizeEventForCAPI } from '../Core/NormalizationService';
import { sendEvent as sendEventToCapi } from '../Http/CapiService';

/**
 * Controller para tracking server-side como backup
 * Funciona quando JavaScript está desabilitado ou bloqueado
 */
export class ServerTrackController {

  /**
   * Endpoint principal para tracking server-side
   * Recebe eventos via pixel de imagem ou form POST
   */
  static async trackServerSide(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
             // Capturar dados da requisição
       const fbclid = req.query.fbclid as string || req.body.fbclid;
       let fbcParam = req.query.fbc as string || req.body.fbc; // ✅ NOVO: Aceitar FBC diretamente
       const eventName = req.query.event as string || req.body.event || 'PageView';
       const clientIp = req.ip || req.connection.remoteAddress || '';
       const userAgent = req.get('User-Agent') || '';
       const sourceUrl = req.query.url as string || req.body.url || req.get('Referer') || '';

       // 🛡️ VALIDAÇÃO CRÍTICA: Detectar e rejeitar FBCs de teste no backend
       if (fbcParam && this.isTestFbc(fbcParam)) {
         logger.warn('[ServerTrack] 🚨 FBC de teste detectado e rejeitado no servidor:', fbcParam);
         fbcParam = null; // Anular FBC de teste
       }
       
       logger.info(`[ServerTrack] 🛡️ BACKUP TRACKING HÍBRIDO iniciado para ${eventName}`, {
         hasJavaScript: false,
         fbclid: fbclid ? fbclid.substring(0, 20) + '...' : 'AUSENTE',
         fbc: fbcParam ? fbcParam.substring(0, 20) + '...' : 'AUSENTE',
         sourceUrl,
         userAgent: userAgent.substring(0, 50) + '...',
         clientIp
       });

       // Validar se temos fbclid OU fbc
       if ((!fbclid || fbclid.trim().length < 10) && (!fbcParam || !fbcParam.startsWith('fb.'))) {
         logger.warn('[ServerTrack] ⚠️ Nem FBCLID nem FBC disponíveis - tracking limitado', {
           fbclid: fbclid || 'null',
           fbc: fbcParam || 'null',
           eventName
         });
       }

             // Obter dados geográficos
       const geoData = await GeoIPService.getGeoData(clientIp);
      logger.debug('[ServerTrack] 🌍 GeoIP obtido', {
        country: geoData?.country?.name,
        city: geoData?.city,
        region: geoData?.region?.name
      });

      // Gerar external_id único para servidor
      const serverExternalId = `server_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

             // ✅ NOVA LÓGICA: Apenas aceitar FBC formatado ou passar fbclid bruto
       let fbc = null;
       if (fbcParam && fbcParam.startsWith('fb.')) {
         // PRIORIDADE 1: FBC já formatado (do frontend)
         fbc = fbcParam;
         logger.debug('[ServerTrack] ✅ Usando FBC pré-formatado do frontend');
       } else {
         // ❌ REMOVIDO: Não formatamos mais fbclid no servidor
         // O frontend deve sempre enviar FBC já formatado
         logger.warn('[ServerTrack] ⚠️ Nenhum FBC formatado recebido. Frontend deve formatar.');
       }

      // Montar userData para CAPI
      const userData = {
        external_id: serverExternalId,
        fbc: fbc, // FBC gerado do fbclid
        fbp: null, // Não temos FBP no server-side
        ct: geoData?.city || null,
        st: geoData?.region?.code || null,
        zp: geoData?.postal || null,
        country: geoData?.country?.code || null
      };

      // Montar customData baseado no evento
      const customData = this.buildCustomDataForEvent(eventName, req, sourceUrl);

      // Normalizar evento para CAPI
      const normalizedEvent = normalizeEventForCAPI({
        eventName,
        eventId: null,
        sourceUrl,
        clientIp,
        userAgent,
        geoData,
        isServerEvent: true,
        userData: userData,
        customData: customData
      });

      if (!normalizedEvent) {
        throw new Error('Falha na normalização do evento');
      }

             // Enviar para Facebook CAPI
       const capiResult = await sendEventToCapi(normalizedEvent);
      
             if (capiResult.status === 'success') {
        logger.info(`[ServerTrack] ✅ Evento ${eventName} enviado com sucesso via backup server-side`, {
          eventId: normalizedEvent.event_id,
          processingTime: Date.now() - startTime,
          fbclid: fbclid ? fbclid.substring(0, 20) + '...' : null
        });
      } else {
        throw new Error(`CAPI falhou: ${capiResult.error}`);
      }

      // Responder com pixel transparente (1x1)
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // GIF transparente 1x1 pixel
      const transparentGif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 
        'base64'
      );
      
      res.status(200).send(transparentGif);

    } catch (error) {
      logger.error('[ServerTrack] ❌ Erro no tracking server-side:', error);
      
      // Retornar pixel mesmo com erro para não quebrar a página
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache'
      });
      
      const errorGif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 
        'base64'
      );
      
      res.status(200).send(errorGif);
    }
  }

  /**
   * Endpoint para tracking via POST (forms sem JavaScript)
   */
  static async trackFormSubmit(req: Request, res: Response): Promise<void> {
    try {
      // Processar dados do formulário
      await this.trackServerSide(req, res);
      
      // Redirecionar ou retornar JSON
      if (req.body.redirect_url) {
        res.redirect(req.body.redirect_url);
      } else {
        res.json({ 
          success: true, 
          message: 'Evento processado via server-side tracking' 
        });
      }
      
    } catch (error) {
      logger.error('[ServerTrack] Erro no form submit:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Falha no server-side tracking' 
      });
    }
  }

  /**
   * 🛡️ Detecta FBCs de teste/desenvolvimento
   */
  private static isTestFbc(fbc: string): boolean {
    if (!fbc || !fbc.startsWith('fb.')) return false;
    
    // Lista de indicadores de dados de teste (ESPECÍFICOS para evitar falsos positivos)
    const testIndicators = [
        'TESTCLICK',           // Nosso exemplo específico de teste
        'TEST123',             // Padrões específicos de teste
        'Test999',             // ✅ ADICIONADO: Padrão Test + números
        'ZZZ',                 // ✅ ADICIONADO: Padrão ZZZ comum em testes
        'DUMMY',               // Dados dummy
        'FAKE',                // Dados falsos
        'MOCK',                // Dados mock
        'DEMO',                // Dados de demonstração
        'SAMPLE',              // Dados de exemplo
        'synthetic_test',      // Sintéticos de teste
        'debug_click',         // Debug específico
        'dev_click',           // Dev específico
        'localhost',           // Local development
        'test_',               // ✅ ADICIONADO: Prefixo test_
        'TEST_',               // ✅ ADICIONADO: Prefixo TEST_
        'example',             // ✅ ADICIONADO: Dados de exemplo
        'EXAMPLE'              // ✅ ADICIONADO: EXAMPLE maiúsculo
    ];
    
    // Verificar se o FBC contém algum indicador de teste
    const fbcLower = fbc.toLowerCase();
    for (const indicator of testIndicators) {
        if (fbcLower.includes(indicator.toLowerCase())) {
            return true;
        }
    }
    
    // ⏰ VALIDAÇÃO DE TIMESTAMP: FBCs muito antigos podem ser de teste
    try {
        // Extrair timestamp do FBC (formato: fb.X.TIMESTAMP.FBCLID)
        const parts = fbc.split('.');
        if (parts.length >= 3) {
            const timestamp = parseInt(parts[2]); // ✅ CORRIGIDO: timestamp já está em milliseconds
            const now = Date.now();
            const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000); // 3 dias atrás
            
            // Se o FBC é muito antigo (mais de 3 dias), considerá-lo suspeito
            if (timestamp < threeDaysAgo) {
                return true;
            }
        }
    } catch (e) {
        logger.warn('[ServerTrack] Erro validando timestamp do FBC:', e);
    }
    
    return false;
  }

  /**
   * Constrói customData baseado no tipo de evento
   */
  private static buildCustomDataForEvent(eventName: string, req: Request, sourceUrl: string): any {
    const baseData = {
      app: 'meta-tracking-server',
      language: 'pt-BR',
      currency: 'BRL',
      referrer_url: req.get('Referer') || '',
      server_side: true
    };

    switch (eventName.toLowerCase()) {
      case 'pageview':
        return {
          ...baseData,
          content_name: req.query.title as string || 'Server Page View',
          content_type: 'page_view',
          content_category: 'General'
        };

      case 'viewcontent':
        return {
          ...baseData,
          content_name: req.query.product_name as string || 'Product',
          content_type: 'product',
          content_category: req.query.category as string || 'Products',
          content_ids: req.query.product_id ? [req.query.product_id as string] : null,
          value: req.query.value ? Number(req.query.value) : null
        };

      case 'lead':
        return {
          ...baseData,
          content_name: 'Lead Form',
          content_type: 'lead',
          content_category: 'Forms'
        };

      default:
        return {
          ...baseData,
          content_name: `Server ${eventName}`,
          content_type: 'server_event'
        };
    }
  }

  /**
   * Endpoint de status para verificar se o tracking server está funcionando
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      service: 'server-side-tracking',
      timestamp: new Date().toISOString(),
      message: '🛡️ Backup tracking server funcionando'
    });
  }
} 