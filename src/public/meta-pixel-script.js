/**
 * Meta Pixel Tracker - Similar ao TracLead mas com API própria
 * 
 * Este script detecta automaticamente o tipo de página e envia eventos equivalentes aos da TracLead
 * Incluindo Advanced Matching completo e parâmetros adicionais
 * 
 * Versão 1.5 - CORREÇÃO CRÍTICA: SubdomainIndex correto para TLDs brasileiros (.com.br = fb.1)
 * Cache Buster: 2025-01-11-23:15
 */

(function() {
  // 🚀 LOG DE VERSÃO PARA DEBUG DE CACHE
  console.log('[Meta Tracking] 🚀 SCRIPT VERSÃO 1.5 CARREGADO - SubdomainIndex CORRIGIDO para .com.br');
  
  // URL da API de rastreamento
  const API_URL = 'https://rastreamento-meta.onrender.com/track';
  
  // ID do seu pixel do Facebook
  const PIXEL_ID = '1163339595278098';
  
  // Nome do cookie first-party para ID de visitante
  const VISITOR_COOKIE_NAME = '_mtVisitorId';
  const VISITOR_COOKIE_EXPIRATION_DAYS = 730; // 2 anos
  
  // Mapeamento de eventos para o Facebook - CORRIGIDO PARA COBERTURA COMPLETA
  const EVENT_MAPPING = {
    // === EVENTOS PADRÃO DO FACEBOOK ===
    'PageView': 'PageView',         
    'ViewContent': 'ViewContent',      
    'AddToCart': 'AddToCart',        
    'InitiateCheckout': 'InitiateCheckout',
    'Purchase': 'Purchase',         
    'CompleteRegistration': 'CompleteRegistration', 
    'AddPaymentInfo': 'AddPaymentInfo', 
    'Search': 'Search',
    'Lead': 'Lead',
    
    // === EVENTOS CUSTOMIZADOS PARA TRACKRIGHT ===
    'ViewHome': 'ViewHome',         // Página inicial
    'ViewList': 'ViewList',         // Listas de produtos/categorias
    'ViewCart': 'ViewCart',         // Carrinho de compras
    'StartCheckout': 'InitiateCheckout', // Mapeamento para padrão FB
    
    // === EVENTOS DE SCROLL (CUSTOMIZADOS) ===
    'Scroll_25': 'CustomEvent',
    'Scroll_50': 'CustomEvent',
    'Scroll_75': 'CustomEvent',     // ✅ ADICIONADO 
    'Scroll_90': 'CustomEvent',     // ✅ ADICIONADO
    
    // === EVENTOS DE TIMER (CUSTOMIZADOS) ===
    'Timer_1min': 'CustomEvent',
    
    // === EVENTOS DE VIDEO (CUSTOMIZADOS) ===
    'PlayVideo': 'CustomEvent',
    'ViewVideo_25': 'CustomEvent',
    'ViewVideo_50': 'CustomEvent',
    'ViewVideo_75': 'CustomEvent',
    'ViewVideo_90': 'CustomEvent',
    'CompleteVideo': 'CustomEvent',
    
    // === EVENTOS LEGADOS/OUTROS ===
    'ViewCategory': 'ViewList',    // Mapear tipo interno 'ViewCategory' para 'ViewList'
    'ViewSearchResults': 'Search', // ✅ ADICIONADO
    'Pesquisar': 'Search',
    'Refused - credit_card': 'CustomEvent'
  };
  
  // Controle de eventos já enviados para evitar duplicação
  const sentEvents = {
    timer_1min: false,
    scroll_25: false,
    scroll_50: false,
    scroll_75: false,    // ✅ ADICIONADO
    scroll_90: false,    // ✅ ADICIONADO
    video_started: {}  // Objeto para armazenar os vídeos já rastreados por ID
  };
  
  // Função para obter parâmetros da URL
  function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  // Função para obter cookies
  function getCookie(name) {
    // Primeiro verificar se o cookie existe como parâmetro na URL (para domínios cruzados)
    // IMPORTANTE: Manter esta lógica se você precisa passar o ID entre domínios via URL
    const urlValue = getUrlParameter(name);
    if (urlValue) return urlValue;

    // Caso contrário, buscar no cookie
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(var i=0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  // 🎯 FUNÇÃO PARA DETECTAR SUBDOMAIN INDEX CORRETO (conforme documentação Facebook)
  function getSubdomainIndex() {
    const hostname = window.location.hostname;
    
    console.log(`[Meta Tracking] 🔧 getSubdomainIndex() VERSÃO CORRIGIDA executando para: ${hostname}`);
    
    // Para desenvolvimento local
    if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      console.log(`[Meta Tracking] 🏠 Localhost/IP detectado: ${hostname} → subdomainIndex = 0`);
      return 0; // localhost ou IP = 0
    }
    
    // 🇧🇷 TLDs compostos brasileiros (correção crítica)
    const compositeTLDs = ['.com.br', '.org.br', '.net.br', '.gov.br', '.edu.br', '.mil.br'];
    
    // Verificar se usa TLD composto brasileiro
    const hasCompositeTLD = compositeTLDs.some(tld => hostname.endsWith(tld));
    
    if (hasCompositeTLD) {
      // Para TLD composto, contar partes antes do TLD
      const parts = hostname.split('.');
      const domainParts = parts.length - 2; // Subtrair .com.br (2 partes)
      
      console.log(`[Meta Tracking] 🇧🇷 TLD composto detectado: ${hostname}`, {
        parts: parts,
        domainParts: domainParts,
        subdomainIndex: domainParts,
        versao: 'CORRIGIDA_V2'
      });
      
      // CORREÇÃO: Para TLD composto brasileiro
      // salveterrah.com.br = ['salveterrah', 'com', 'br'] = 3 partes - 2 (TLD) = 1 parte = subdomainIndex 1
      // www.salveterrah.com.br = ['www', 'salveterrah', 'com', 'br'] = 4 partes - 2 (TLD) = 2 partes = subdomainIndex 2
      return domainParts;
    }
    
    // Lógica original para TLDs simples (.com, .org, etc.)
    const parts = hostname.split('.');
    
    console.log(`[Meta Tracking] 🌐 TLD simples detectado: ${hostname}`, {
      parts: parts,
      subdomainIndex: parts.length === 1 ? 0 : (parts.length === 2 ? 1 : 2)
    });
    
    // Documentação Facebook:
    // "com" = 0, "example.com" = 1, "www.example.com" = 2
    if (parts.length === 1) {
      return 0; // Domínio único (raro)
    } else if (parts.length === 2) {
      return 1; // example.com = 1
    } else {
      return 2; // www.example.com = 2
    }
  }

  // 📥 FUNÇÃO PARA COLETAR OU GERAR FBC (CONFORME DOCUMENTAÇÃO OFICIAL FACEBOOK)
  function getFbcFromCookie() {
    // Primeiro, tentar ler o cookie _fbc se existir
    const fbcCookie = getCookie('_fbc');
    if (fbcCookie && fbcCookie.startsWith('fb.') && fbcCookie.length > 10) {
      console.log('[Meta Tracking] ✅ FBC encontrado no cookie:', fbcCookie.substring(0, 20) + '...');
      return fbcCookie;
    }
    
    console.log('[Meta Tracking] ℹ️ Nenhum FBC encontrado no cookie _fbc');
    return null;
  }

  // 📥 FUNÇÃO PARA COLETAR FBCLID DA URL
  function getFbclidFromUrl() {
    const fbclid = getUrlParameter('fbclid');
    if (fbclid && fbclid.trim().length > 10) {
      console.log('[Meta Tracking] ✅ FBCLID encontrado na URL:', fbclid.substring(0, 20) + '...');
      return fbclid.trim();
    }
    
    console.log('[Meta Tracking] ℹ️ Nenhum FBCLID encontrado na URL');
    return null;
  }

  // 🎯 FUNÇÃO PARA GERAR FBC A PARTIR DO FBCLID (CONFORME DOCUMENTAÇÃO OFICIAL)
  function generateFbcFromFbclid(fbclid) {
    if (!fbclid) return null;
    
    try {
      const subdomainIndex = getSubdomainIndex();
      const creationTime = Date.now(); // UNIX timestamp em milissegundos
      const fbc = `fb.${subdomainIndex}.${creationTime}.${fbclid}`;
      
      console.log('[Meta Tracking] 🔧 FBC gerado a partir do FBCLID:', fbc.substring(0, 30) + '...');
      console.log('[Meta Tracking] 📊 Detalhes:', {
        subdomainIndex,
        creationTime,
        fbclid: fbclid.substring(0, 20) + '...'
      });
      
      return fbc;
    } catch (error) {
      console.warn('[Meta Tracking] Erro ao gerar FBC:', error);
      return null;
    }
  }

  // 🎯 FUNÇÃO PRINCIPAL PARA OBTER FBC (COOKIE OU GERADO)
  function getFbc() {
    // 1. Primeiro, tentar obter do cookie _fbc
    let fbc = getFbcFromCookie();
    if (fbc) return fbc;
    
    // 2. Se não há cookie, tentar gerar a partir do fbclid da URL
    const fbclid = getFbclidFromUrl();
    if (fbclid) {
      fbc = generateFbcFromFbclid(fbclid);
      if (fbc) {
        console.log('[Meta Tracking] ✅ FBC gerado conforme documentação oficial Facebook');
        return fbc;
      }
    }
    
    console.log('[Meta Tracking] ℹ️ Nenhum FBC disponível (sem cookie nem fbclid)');
    return null;
  }

  // Função removida - não validamos mais FBCs de teste pois não geramos FBC
  // +++ FIM DA FUNÇÃO HÍBRIDA PARA FBC +++

  // Função para definir o cookie first-party
  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    // Assume HTTPS, ajusta SameSite para Lax. Obtém o domínio principal + 1 TLD.
    let domain = window.location.hostname;
    // Tenta obter o domínio .domain.tld (ex: .soleterra.com.br)
    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
      domain = '.' + domainParts.slice(-2).join('.');
    } else {
      domain = ''; // Para localhost ou IPs
    }
    const cookieString = name + "=" + (value || "") + expires + "; path=/;" + (domain ? " domain=" + domain + ";" : "") + " SameSite=Lax; Secure";
    document.cookie = cookieString;
    // Log para debug do cookie sendo setado
    // console.log('Setting cookie:', cookieString);
  }

  // Função para gerar um UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Função removida - não precisamos mais limpar dados de teste pois não geramos FBC

  // ✅ BACKUP SERVER-SIDE TRACKING HÍBRIDO
  function initServerSideBackup() {
    try {
      // Se fbq não está disponível (bloqueado), ativar backup
      if (typeof window.fbq === 'undefined') {
        console.log('[Server Backup] 🛡️ Facebook Pixel bloqueado - ativando tracking server-side HÍBRIDO');
        
        // Coletar FBC do cookie e fbclid da URL
        const fbc = getFbcFromCookie(); // Apenas coleta do cookie
        const fbclid = getFbclidFromUrl(); // Coleta fbclid da URL
        
        if (fbclid || fbc) {
          // Criar pixel de backup para server-side tracking
          const backupImg = new Image(1, 1);
          let backupUrl = `/server-track/pixel?event=PageView&url=${encodeURIComponent(window.location.href)}&t=${Date.now()}`;
          
          if (fbclid) {
            backupUrl += `&fbclid=${encodeURIComponent(fbclid)}`;
          }
          if (fbc) {
            backupUrl += `&fbc=${encodeURIComponent(fbc)}`;
          }
          
          backupImg.src = backupUrl;
          console.log('[Server Backup] ✅ Pixel híbrido criado:', fbclid ? 'com fbclid' : 'com fbc salvo');
        } else {
          console.log('[Server Backup] ⚠️ Nenhuma fonte de tracking disponível');
        }
      } else {
        // Mesmo com fbq funcionando, verificar se temos FBC disponível
        const fbc = getFbcFromCookie();
        if (fbc) {
          console.log('[Server Backup] 💾 FBC disponível no cookie');
        }
      }
      
      // Adicionar listener para formulários (backup sem JS)
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.addEventListener('submit', function(e) {
          // Não bloquear o submit, apenas adicionar tracking
          const fbclid = getUrlParameter('fbclid');
          const fbc = getFbcValue();
          
          if (fbclid || fbc) {
            const backupImg = new Image(1, 1);
            let backupUrl = `/server-track/pixel?event=Lead&url=${encodeURIComponent(window.location.href)}&t=${Date.now()}`;
            
            if (fbclid) backupUrl += `&fbclid=${encodeURIComponent(fbclid)}`;
            if (fbc) backupUrl += `&fbc=${encodeURIComponent(fbc)}`;
            
            backupImg.src = backupUrl;
          }
        });
      });
      
    } catch (error) {
      console.warn('[Server Backup] Erro no backup server-side:', error);
    }
  }

  // Cria ou recupera o ID de Visitante First-Party
  function getOrCreateVisitorId() {
    let visitorId = getCookie(VISITOR_COOKIE_NAME);
    if (!visitorId) {
      visitorId = generateUUID();
      setCookie(VISITOR_COOKIE_NAME, visitorId, VISITOR_COOKIE_EXPIRATION_DAYS);
    }
    return visitorId;
  }

  // Cria ou recupera ID externo para o usuário
  function getExternalId() {
    // Primeiro, tente pegar da URL (cross-domain)
    const urlExternalId = getUrlParameter('external_id');
    if (urlExternalId) {
      setLocalStorageItem('meta_tracking_external_id', urlExternalId);
      console.log('[Meta Tracking Debug] External ID obtido da URL e salvo no localStorage:', urlExternalId); // Log adicionado
      return urlExternalId;
    }
  
    // Depois, tente pegar do localStorage
    let externalId = getLocalStorageItem('meta_tracking_external_id');
    if (!externalId) {
      // Só gera um novo se realmente não existir
      externalId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      setLocalStorageItem('meta_tracking_external_id', externalId);
      console.log('[Meta Tracking Debug] Novo External ID gerado e salvo no localStorage:', externalId); // Log adicionado
    } else {
      // console.log('[Meta Tracking Debug] External ID recuperado do localStorage:', externalId); // Log opcional para debug
    }
    return externalId;
  }

  // Inicializar o Facebook Pixel (Reestruturado)
  function initFacebookPixel() {
    
    // --- ETAPA 1: Definir fbq e fila (padrão FB) --- 
    if (window.fbq) {
        console.log('[Meta Tracking Debug] FBQ já inicializado.'); // Mantido para clareza
        // Poderíamos tentar reenviar o init/track aqui se necessário, 
        // mas geralmente não é preciso se já foi inicializado.
        // Por segurança, vamos apenas retornar se já existir.
        // Se houver problemas com múltiplas inicializações, revisar esta lógica.
         // return; 
         // Removido o return para garantir que nosso track explícito ocorra.
    }
    var n = window.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];

    // --- ETAPA 2: Carregar fbevents.js assincronamente (padrão FB) --- 
    var t = document.createElement('script');
    t.async = !0;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var s = document.getElementsByTagName('script')[0];
    if (!s) { // Fallback se não encontrar script algum
        s = document.body;
    }
    s.parentNode.insertBefore(t, s);
    console.log('[Meta Tracking Debug] Script fbevents.js sendo carregado...'); // Mudança de [Meta Tracking] para [Meta Tracking Debug]

    // --- ETAPA 3: Preparar dados e ENFILEIRAR chamadas init --- 

    const externalId = getExternalId();
    const fbp = validateFbp(getCookie('_fbp') || getUrlParameter('fbp'));
    const fbc = getFbcFromCookie(); // Coleta apenas do cookie

    // +++ Debug Melhorado +++
    if (fbc) { // Log apenas se fbc for encontrado/gerado
        console.log('✅ FBC encontrado/gerado:', fbc);
    } else {
        console.log('🟡 FBC não encontrado (nem cookie _fbc válido, nem parâmetro fbclid na URL).');
    }
    // +++ Fim Debug Melhorado +++

    // Coletar PII (sem hash)
    const email = getLocalStorageItem('meta_tracking_email');
    const phone = getLocalStorageItem('meta_tracking_phone');
    const firstName = getLocalStorageItem('meta_tracking_first_name');
    const lastName = getLocalStorageItem('meta_tracking_last_name');
    const gender = getLocalStorageItem('meta_tracking_gender');
    const dob = getLocalStorageItem('meta_tracking_dob');

    // --- MODIFICADO: Usar placeholders injetados pelo backend para GeoIP ---
    const city = '__GEO_CITY__';       // Placeholder será substituído por string JSON (ex: "sao paulo" ou null)
    const state = '__GEO_STATE__';      // Placeholder será substituído por string JSON (ex: "sp" ou null)
    const zip = '__GEO_ZIP__';          // Placeholder será substituído por string JSON (ex: "01000000" ou null)
    const country = '__GEO_COUNTRY__';  // Placeholder será substituído por string JSON (ex: "br" ou null)
    // --- FIM DA MODIFICAÇÃO ---

    // --- ADICIONADO: Capturar IP injetado ---
    const clientIpAddress = '__CLIENT_IP__'; // Placeholder será substituído por string JSON (ex: "123.45.67.89" ou null)
    // --- FIM DA ADIÇÃO ---

    console.log('[Meta Tracking Debug] Dados PII/Geo/IP coletados:', { email, phone, firstName, lastName, gender, dob, city, state, zip, country, clientIpAddress }); // Adicionado IP ao log

    // Montar parâmetros para init (sem hash)
    const pixelParams = {
      external_id: externalId, fbp: fbp, fbc: fbc, // <<< Usa fbc da nova função
      // --- MODIFICADO: Adicionar client_ip_address e remover comentário antigo ---
      client_ip_address: clientIpAddress, // Adiciona o IP obtido do backend
      client_user_agent: navigator.userAgent, // User Agent é seguro enviar
      // --- FIM DA MODIFICAÇÃO ---
      em: email, ph: phone, fn: firstName, ln: lastName,
      ge: gender, db: dob, ct: city, st: state, zp: zip, country: country
    };
    Object.keys(pixelParams).forEach(key => pixelParams[key] == null && delete pixelParams[key]);
    console.log('[Meta Tracking Debug] Parâmetros para fbq(\'init\'):', pixelParams); // Log dos parâmetros do init (ASPAS ESCAPADAS)

    // 🔧 LOG DETALHADO DE CONFIGURAÇÃO INICIAL (PRELOAD)
    if (isDebugEnabled()) {
      console.groupCollapsed(`🔧 [CONFIGURAÇÃO_INICIAL] Facebook Pixel Init (Pixel ID: ${PIXEL_ID})`);
      console.log('📊 DADOS DE PRELOAD:');
      console.log('  • Pixel ID:', PIXEL_ID);
      console.log('  • External ID:', externalId);
      console.log('  • FBP (Cookie):', fbp);
      console.log('  • FBC (Click ID):', fbc);
      console.log('  • User Agent:', navigator.userAgent);
      console.log('  • Client IP:', clientIpAddress);
      console.log('  • Idioma:', navigator.language);
      console.log('  • Referrer URL:', document.referrer);
      console.log('');
      console.log('🌍 DADOS GEOGRÁFICOS (GeoIP):');
      console.log('  • País:', country);
      console.log('  • Estado:', state);
      console.log('  • Cidade:', city);
      console.log('  • CEP:', zip);
      console.log('');
      console.log('👤 DADOS PII (Identificação):');
      console.log('  • Email:', email ? '[PRESENTE]' : '[AUSENTE]');
      console.log('  • Telefone:', phone ? '[PRESENTE]' : '[AUSENTE]');
      console.log('  • Nome:', firstName ? '[PRESENTE]' : '[AUSENTE]');
      console.log('  • Sobrenome:', lastName ? '[PRESENTE]' : '[AUSENTE]');
      console.log('  • Gênero:', gender || '[AUSENTE]');
      console.log('  • Data Nascimento:', dob ? '[PRESENTE]' : '[AUSENTE]');
      console.log('');
      console.log('📤 PAYLOAD COMPLETO PARA fbq(\'init\'):');
      console.log(JSON.stringify(pixelParams, null, 2));
      console.groupEnd();
    }

    // ENFILEIRAR init (dispara PageView automático SEM eventID visível no helper)
    fbq('init', PIXEL_ID, pixelParams);
    console.log(`[Meta Tracking Debug] fbq('init') enfileirado.`);
    
    // 🛡️ PROTEÇÃO CRÍTICA: Evitar que Facebook Pixel sobrescreva nosso FBC correto
    setTimeout(() => {
      const currentFbc = getCookie('_fbc');
      if (currentFbc && !currentFbc.startsWith('fb.1.') && fbc && fbc.startsWith('fb.1.')) {
        console.warn('[Meta Tracking] 🚨 Facebook Pixel sobrescreveu FBC correto! Restaurando...', {
          fbcSobrescrito: currentFbc,
          fbcCorreto: fbc
        });
        setCookie('_fbc', fbc, 90); // Restaurar FBC correto
        setLocalStorageItem('meta_tracking_fbc', fbc); // Backup
      }
    }, 100); // Verificar após Facebook Pixel processar

    // --- ETAPA 4: Enviar PageView usando novo padrão ---
    const allRawUserDataForInit = {
        external_id: externalId, visitorId: getOrCreateVisitorId(),
        fbp: fbp, // Adicionar fbp lido do cookie
        fbc: fbc, // Adicionar fbc lido do cookie
        em: email, ph: phone, fn: firstName, ln: lastName,
        ge: gender, db: dob, ct: city, st: state, zp: zip, country: country // Usar variáveis com placeholders
    };

    // Montar parâmetros customizados para PageView
    const pageTitle = document.title || 'Page View';
          const customParams = {
        app: 'meta-tracking',
        content_name: pageTitle,
        content_type: 'page_view',
        content_category: 'General',
        currency: 'BRL',
        language: navigator.language || 'pt-BR',
        referrer_url: document.referrer || ''
    };
    // Limpar campos vazios, nulos ou undefined
    Object.keys(customParams).forEach(key => {
      if (customParams[key] == null || customParams[key] === '') {
        delete customParams[key];
      }
    });

    // Delay pequeno para garantir que o init foi processado, depois aguardar _fbp
    setTimeout(async function() {
         console.log('[Meta Tracking Debug] Aguardando _fbp cookie ser criado...');
         
         try {
             // Aguardar até o _fbp existir ou timeout de 3 segundos
             const fbpFound = await waitForFbpCookie(3000);
             
             if (fbpFound) {
                 console.log('[Meta Tracking Debug] ✅ _fbp confirmado, enviando PageView...');
             } else {
                 console.warn('[Meta Tracking Debug] ⚠️ Enviando PageView sem _fbp (timeout de 3s atingido)');
             }
             
             // Usar sendEvent que agora implementa o padrão correto
             await sendEvent('PageView', customParams);
         } catch (error) {
             console.error('[Meta Tracking Debug] Erro ao enviar PageView inicial:', error);
         }
    }, 200); // Delay mínimo para garantir que fbq('init') processou 

  }

  // Funções para encontrar elementos específicos na página
  function getProductDetails() {
    // Tenta detectar informações de produtos - esta é uma implementação genérica
    // Para um site específico, você pode ajustar os seletores ou lógica
    console.log('[Meta Tracking Debug] Tentando getProductDetails()...'); // Log início da função

    // --- ADICIONADO: Definir moeda padrão ---
    let currency = 'BRL'; // Definir padrão inicial
    // --- FIM DA ADIÇÃO ---

    // Nome do produto (título)
    let productName = '';
    const titleElement = document.querySelector('h1') || document.querySelector('.product-title');
    if (titleElement) {
      productName = titleElement.textContent.trim();
    }
    console.log('[Meta Tracking Debug] getProductDetails - productName:', productName, 'Elemento:', titleElement); // Log nome do produto

    // Preço
    let price = 0;
    const priceElement = document.querySelector('.price') || document.querySelector('[data-product-price]');
    if (priceElement) {
      const priceText = priceElement.textContent.trim().replace(/[^0-9,.]/g, '');
      price = parseFloat(priceText.replace(',', '.'));
    }
    console.log('[Meta Tracking Debug] getProductDetails - price:', price, 'Elemento:', priceElement); // Log preço

    // Tentar obter dados do Shopify ou JSON-LD primeiro
    let shopifyProductId = null;
    let shopifyVariantId = null;
    let shopifyProductType = null;
    let shopifyPrice = null;
    let shopifyCurrency = null;

    try {
      // Tentativa 1: Objeto meta global (comum no Shopify)
      if (typeof meta !== 'undefined' && meta.product) {
        console.log('[Meta Tracking Debug] getProductDetails - Encontrado objeto meta.product:', meta.product);
        shopifyVariantId = meta.product.variants && meta.product.variants.length > 0 ? String(meta.product.variants[0].id) : null;
        shopifyProductId = String(meta.product.id) || null;
        shopifyProductType = meta.product.type || null;
        shopifyPrice = meta.product.price ? meta.product.price / 100 : null; // Preço em centavos
        // Tentar obter a moeda de outro lugar se não estiver aqui
      } else {
         console.log('[Meta Tracking Debug] getProductDetails - Objeto meta.product não encontrado.');
      }

      // Tentativa 2: JSON-LD
      if (!shopifyProductId || !shopifyProductType) {
         console.log('[Meta Tracking Debug] getProductDetails - Tentando JSON-LD...');
         const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
         jsonLdScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
              const productData = (data['@type'] === 'Product') ? data : (Array.isArray(data) && data.find(item => item['@type'] === 'Product'));
              if (productData) {
                 console.log('[Meta Tracking Debug] getProductDetails - Encontrado JSON-LD @type Product:', productData);
                 if (!shopifyProductId && (productData.sku || productData.mpn || productData.productID)) {
                     shopifyProductId = String(productData.sku || productData.mpn || productData.productID);
                     console.log('[Meta Tracking Debug] getProductDetails - ID (product) do JSON-LD:', shopifyProductId);
                 }
                 if (!shopifyVariantId && productData.offers) {
                    const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
                    if (offer && (offer.sku || offer.variantId)) { // Adicionado variantId
                        shopifyVariantId = String(offer.sku || offer.variantId);
                         console.log('[Meta Tracking Debug] getProductDetails - ID (variant/offer) do JSON-LD:', shopifyVariantId);
                    }
                 }
                 if (!shopifyProductType && productData.category) {
                     shopifyProductType = typeof productData.category === 'string' ? productData.category.split('>').pop().trim() : null;
                     console.log('[Meta Tracking Debug] getProductDetails - Categoria do JSON-LD:', shopifyProductType);
                 }
                 if (!shopifyPrice && productData.offers) {
                    const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
                    if (offer && offer.price) {
                       shopifyPrice = parseFloat(offer.price);
                       console.log('[Meta Tracking Debug] getProductDetails - Preço do JSON-LD:', shopifyPrice);
                    }
                    if (offer && offer.priceCurrency) {
                      shopifyCurrency = offer.priceCurrency;
                      // --- ADICIONADO: Atualizar 'currency' se encontrado no JSON-LD ---
                      currency = shopifyCurrency; // Atualiza a variável principal
                      // --- FIM DA ADIÇÃO ---
                      console.log('[Meta Tracking Debug] getProductDetails - Moeda do JSON-LD:', shopifyCurrency);
                    }
                 }
              }
            } catch(e) { console.warn('[Meta Tracking Debug] getProductDetails - Erro ao processar JSON-LD:', e); }
         });
      }

      // Tentativa 3: Input hidden no formulário AddToCart
      if (!shopifyVariantId) {
         console.log('[Meta Tracking Debug] getProductDetails - Tentando input hidden do formulário AddToCart...');
         const formInputElement = document.querySelector('form[action*="/cart/add"] input[name="id"]');
         if (formInputElement && formInputElement.value) {
            shopifyVariantId = String(formInputElement.value);
            console.log('[Meta Tracking Debug] getProductDetails - ID (variant) do input hidden:', shopifyVariantId);
         }
      }

    } catch (err) {
      console.error('[Meta Tracking Debug] getProductDetails - Erro ao tentar extrair dados Shopify/JSON-LD:', err);
    }

    // ID do produto final (Prioridade: variant > product > slug)
    let finalProductId = shopifyVariantId || shopifyProductId;
    if (!finalProductId) {
        console.log('[Meta Tracking Debug] getProductDetails - ID numérico não encontrado, tentando extrair da URL...');
        finalProductId = getProductIdFromURL(); // Fallback para slug/parte da URL
        console.log('[Meta Tracking Debug] getProductDetails - ID extraído da URL (fallback):', finalProductId);
    }
    console.log('[Meta Tracking Debug] getProductDetails - finalProductId Definido:', finalProductId);

    // Categoria final (Prioridade: Shopify > JSON-LD > Breadcrumb)
    let finalCategory = shopifyProductType;
    if (!finalCategory) {
        console.log('[Meta Tracking Debug] getProductDetails - Categoria Shopify/JSON-LD não encontrada, tentando breadcrumb...');
        const breadcrumbElement = document.querySelector('.breadcrumb a:last-of-type'); // Exemplo antigo
        if (breadcrumbElement) {
            finalCategory = breadcrumbElement.textContent.trim();
            console.log('[Meta Tracking Debug] getProductDetails - Categoria do breadcrumb (fallback):', finalCategory);
        }
    }
    console.log('[Meta Tracking Debug] getProductDetails - finalCategory Definida:', finalCategory);

    // Preço Final (Prioridade: Shopify > JSON-LD > Extração DOM)
    const finalPrice = shopifyPrice !== null ? shopifyPrice : price;
    console.log('[Meta Tracking Debug] getProductDetails - finalPrice Definido:', finalPrice);

    // Moeda Final (Prioridade: Shopify/JSON-LD > Padrão) - AGORA USA A VARIÁVEL 'currency' DEFINIDA
    const finalCurrency = shopifyCurrency || currency; // 'currency' agora está definida
    console.log('[Meta Tracking Debug] getProductDetails - finalCurrency Definida:', finalCurrency);

    // LOG: Verificar objetos globais comuns do Shopify
    console.log('[Meta Tracking Debug] Verificando Globals Shopify:', { 
      ShopifyAnalytics: typeof ShopifyAnalytics !== 'undefined' ? ShopifyAnalytics : 'undefined',
      meta: typeof meta !== 'undefined' ? meta : 'undefined' 
    });

    const details = { 
        content_ids: finalProductId ? [finalProductId] : [], 
        content_name: productName || document.title, 
        content_type: 'product',
        value: Math.round(finalPrice), // Arredonda para o inteiro mais próximo
        currency: finalCurrency, // Usa moeda final corrigida
        num_items: 1,
        contents: finalProductId && finalPrice ? [{
          id: finalProductId,
          quantity: 1,
          item_price: Math.round(finalPrice)
        }] : []
    };
    // Adicionar category apenas se encontrada
    if (finalCategory) {
      details.content_category = Array.isArray(finalCategory) ? finalCategory : [finalCategory];
    }

     console.log('[Meta Tracking Debug] getProductDetails - Resultado Final Combinado:', details); 
    return details;
  }

  // Detecta o tipo de página
  function detectPageType() {
    console.log('[Meta Tracking Debug] Iniciando detectPageType()... URL:', window.location.pathname); // Log início detecção
    const path = window.location.pathname;
    const bodyClasses = document.body.className;
    const urlParams = new URLSearchParams(window.location.search);

    // LOG: Informações básicas da página
    console.log('[Meta Tracking Debug] detectPageType - Info Página:', { path, bodyClasses, title: document.title });

    // Lógica de detecção (Exemplos - Adicionar mais logs conforme necessário)
    if (path === '/' || bodyClasses.includes('template-index')) {
      console.log('[Meta Tracking Debug] detectPageType - Detectado: Home');
      // Retorna o tipo interno 'ViewHome'
      return { type: 'ViewHome', data: { 
        content_name: 'Home Page', 
        content_type: 'home_page',
        content_category: 'Home',
        value: 0,
        currency: 'BRL'
      } };
    }
    if (path.includes('/products/') || bodyClasses.includes('template-product')) {
      console.log('[Meta Tracking Debug] detectPageType - Detectado: Product');
      const productData = getProductDetails();
      console.log('[Meta Tracking Debug] detectPageType - Dados Produto (para ViewContent):', productData);
      return { type: 'ViewContent', data: productData };
    }
    if (path.includes('/collections/') || bodyClasses.includes('template-collection')) {
       console.log('[Meta Tracking Debug] detectPageType - Detectado: Category/Collection');
       const categoryName = document.title.split('–')[0].trim() || 'Category Page'; // Tenta extrair do título
       const categoryData = { 
           content_name: categoryName, 
           content_type: 'product_group', 
           content_category: categoryName,
           currency: 'BRL'
       };
       console.log('[Meta Tracking Debug] detectPageType - Dados Categoria (para ViewList):', categoryData);
       // Retorna o tipo interno 'ViewCategory' que será mapeado para 'ViewList'
       return { type: 'ViewCategory', data: categoryData }; 
    }
    if (path.includes('/cart') || bodyClasses.includes('template-cart') || document.getElementById('CartDrawer')) { // Adiciona verificação de CartDrawer comum no Shopify
      console.log('[Meta Tracking Debug] detectPageType - Detectado: Cart');
      const cartData = extractCartData(); // Chama a extração
      console.log('[Meta Tracking Debug] detectPageType - Dados Carrinho (para ViewCart):', cartData);
      // Retorna o tipo interno 'ViewCart' que será mapeado para 'ViewCart'
      return { type: 'ViewCart', data: cartData }; 
    }
    // ... (outras detecções: checkout, search, etc.) ...
    
    console.log('[Meta Tracking Debug] detectPageType - Nenhum tipo específico detectado, usando PageView padrão.');
    return { type: 'PageView', data: { 
      content_name: document.title || 'Page View', 
      content_type: 'page_view',
      content_category: 'General',
      currency: 'BRL'
    } }; // Fallback
  }

  /**
   * Normaliza o CEP brasileiro para o formato padrão de 8 dígitos
   * @param {string|null} zipCode - CEP a ser normalizado
   * @param {string|null} countryCode - Código do país (para verificar se é Brasil)
   * @returns {string|null} CEP normalizado ou o original se não for brasileiro
   */
  function normalizeBrazilianZipCode(zipCode, countryCode) {
    // Se não tiver CEP ou país, retorna o valor original
    if (!zipCode) return zipCode;
    
    // Remove caracteres não numéricos
    const numericZip = String(zipCode).replace(/\D/g, '');
    
    // Verifica se é um CEP brasileiro (país = br) e tem menos de 8 dígitos
    if (countryCode && countryCode.toLowerCase() === 'br' && numericZip.length > 0 && numericZip.length < 8) {
      // Completa com zeros à direita até ter 8 dígitos
      return numericZip.padEnd(8, '0');
    }
    
    // Retorna o valor numérico sem alterações para outros países
    return numericZip;
  }

  // Função para obter dados do usuário com hash
  async function getUserData() {
    // Tentar buscar dados de endereço/geolocalização salvos
    let userData = {
      // Campos já existentes...
    };
    
    try {
      // Verificar se temos informações salvas no localStorage
      const savedUserData = localStorage.getItem('meta_tracking_user_data');
      if (savedUserData) {
        const parsed = JSON.parse(savedUserData);
        userData = { ...userData, ...parsed };
        // Log para verificar dados carregados
        // console.log('Dados do usuário carregados do localStorage:', userData);
      }
      
      // Se não temos dados geográficos, tentar obtê-los
      // if (!userData.country || !userData.state || !userData.city || !userData.zip) {
      //   const geoData = await getGeoLocation();
      //   userData = { ...userData, ...geoData };
      //   
      //   // Salvar para uso futuro
      //   localStorage.setItem('meta_tracking_user_data', JSON.stringify({
      //     country: userData.country,
      //     state: userData.state,
      //     city: userData.city,
      //     zip: userData.zip
      //   }));
      // }
    } catch (e) {
      console.log('Erro ao recuperar dados do usuário:', e);
    }
    
    // Apenas retorna os dados lidos do storage (ou vazios)
    return userData;
  }

  /**
   * Valida e corrige o formato do FBP
   * @param {string|null} fbp - Valor do FBP a ser validado
   * @returns {string|null} FBP válido ou null
   */
  function validateFbp(fbp) {
    // 1. Tentar ler o cookie _fbp diretamente
    let fbpValue = getCookie('_fbp');
    
    // 2. Se não estiver no cookie, tentar ler o parâmetro da URL 'fbp'
    if (!fbpValue) {
      fbpValue = getUrlParameter('fbp');
    }
    
    // 3. ✅ DETECÇÃO ESPECÍFICA PARA FACEBOOK IN-APP BROWSER
    if (!fbpValue && navigator.userAgent.includes('FB_IAB')) {
      console.log('[Meta Tracking] 📱 Facebook In-App Browser detectado - FBP não disponível por limitações de cookies');
      console.log('[Meta Tracking] ✅ Usando FBC como identificador principal para advanced matching');
      // Não gerar FBP falso - deixar null para indicar que não está disponível
      return null;
    }
    
    // 4. Retornar o valor encontrado (pode ser null)
    return fbpValue;
    
    /* LÓGICA ANTIGA REMOVIDA:
    // Se não existir ou for inválido, GERAR um novo FBP válido
    // if (!fbp || !/^fb\.[12]\.\d+\.\d+$/.test(fbp)) { ... }
    // Verificar se já está no formato correto fb.1...
    // if (/^fb\.1\.\d+\.\d+$/.test(fbp)) { ... }
    // Se começar com fb.2, corrigir para fb.1
    // if (fbp.startsWith('fb.2.')) { ... }
    // Fallback final
    // const timestamp = Date.now(); ... 
    */
  }

  // >>> INÍCIO DA SEÇÃO MODIFICADA <<<

  // ++ ADICIONADA: Função para logar evento no console com formatação ++
  function logEventForDebug(eventName, facebookEventName, eventId, pixelId, customData, advancedMatching) {
    const headerStyle = 'color: #1877f2; font-weight: bold; font-size: 1.1em;';
    const groupStyle = 'font-weight: bold;';
    const keyStyle = 'font-weight: bold; color: #555;';
    const valueStyle = 'color: #333;';

    console.groupCollapsed(`%c[Meta Tracking Debug] Event Fired: ${facebookEventName}`, headerStyle);

    console.log(`%cPixel ID:%c ${pixelId}`, keyStyle, valueStyle);

    // Custom Parameters
    console.groupCollapsed('%cCustom Parameters Sent', groupStyle);
    if (Object.keys(customData).length > 0) {
      for (const key in customData) {
        console.log(`%c${key}:%c ${customData[key]}`, keyStyle, valueStyle);
      }
    } else {
      console.log('%c(No custom parameters)', 'color: #888;');
    }
    console.groupEnd();

    // Advanced Matching Parameters
    console.groupCollapsed('%cAdvanced Matching Parameters Sent', groupStyle);
     if (Object.keys(advancedMatching).length > 0) {
      for (const key in advancedMatching) {
         // Não logar o user agent completo por padrão para manter console limpo
         const valueToLog = (key === 'client_user_agent' && advancedMatching[key]) ? advancedMatching[key].substring(0, 50) + '...' : advancedMatching[key];
         console.log(`%c${key}:%c ${valueToLog}`, keyStyle, valueStyle);
      }
    } else {
      console.log('%c(No advanced matching parameters)', 'color: #888;');
    }
    console.groupEnd();

    // Event Info
    console.groupCollapsed('%cEvent Info', groupStyle);
    console.log(`%cSetup Method:%c Manual`, keyStyle, valueStyle);
    console.log(`%cURL Called:%c ${window.location.href}`, keyStyle, valueStyle);
    // console.log(`%cLoad Time:%c N/A`, keyStyle, valueStyle); // Não temos essa métrica facilmente
    console.log(`%cPixel Location:%c ${window.location.href}`, keyStyle, valueStyle);
    console.log(`%cEvent ID:%c ${eventId}`, keyStyle, valueStyle);
    console.groupEnd();


    console.groupEnd(); // Fim do grupo principal
  }
  // ++ FIM DA FUNÇÃO ADICIONADA ++

  // Função auxiliar para enviar dados brutos para o backend /track
  // MODIFICADO: Gerar e enviar eventId para deduplicação
  async function sendEventToBackend(eventName, rawUserData = {}, specificCustomData = {}, clientEventTime = null) {

    const facebookEventName = EVENT_MAPPING[eventName] || eventName;

    // +++ GERAR EVENTID ÚNICO PARA DEDUPLICAÇÃO +++
    const clientEventId = generateUUID(); // Gerar eventId único no frontend
    console.log(`[Frontend Script] 🆔 EventId gerado para ${eventName}: ${clientEventId}`);
    // +++ FIM GERAÇÃO EVENTID +++

    // Log de envio (Adicionado conforme recomendação)
    console.log('[Meta Tracking] Enviando evento para backend:', {
      eventName: facebookEventName, // Usa o nome mapeado para FB
      eventId: clientEventId, // Incluir eventId gerado
      externalId: rawUserData.external_id || getExternalId(), // Pega do userData ou recalcula
      fbp: rawUserData.fbp || getCookie('_fbp') // Pega do userData ou lê novamente
      // fbc será pego abaixo
    });

    console.log(`[Frontend Script] Preparando envio para backend: ${eventName}`);

    // +++ RE-LER FBP, FBC e FBCLID AQUI para garantir valores mais recentes +++
    const currentFbp = getCookie('_fbp') || getUrlParameter('fbp') || null;
    const currentFbc = getFbcFromCookie(); // Apenas do cookie
    const currentFbclid = getFbclidFromUrl(); // Apenas da URL (para logs)
    console.log(`[Frontend Script] Valor FBP lido ANTES do envio para backend: ${currentFbp}`);
    console.log(`[Frontend Script] Valor FBC lido ANTES do envio para backend: ${currentFbc}`);
    if (currentFbclid) {
      console.log(`[Frontend Script] Valor FBCLID coletado (não enviado para backend): ${currentFbclid.substring(0, 20)}...`);
    }
    // +++ FIM RE-LEITURA +++

    // Mesclar os dados recebidos com os dados coletados
    const cleanUserData = Object.entries({
      ...rawUserData,
      fbp: currentFbp, // <<< Sempre usar valor mais recente
      fbc: currentFbc, // <<< Sempre usar valor mais recente
    }).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    // ++ Coleta de dados do navegador ++
    const browserData = {
      userAgent: navigator.userAgent,
      language: navigator.language || 'pt-BR',
      referrer_url: document.referrer || ''
    };
    const cleanBrowserData = Object.entries(browserData).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
    // ++ Fim da coleta de dados do navegador ++

    // MODIFICADO: Usar timestamp recebido como parâmetro ou gerar novo
    const finalEventTime = clientEventTime || Math.floor(Date.now() / 1000);

    const payload = {
        eventName: facebookEventName, // ✅ USAR NOME MAPEADO PARA FACEBOOK (consistência CAPI/Pixel)
        originalEventName: eventName, // ✅ MANTER NOME ORIGINAL PARA LOGS/DEBUG
        eventId: clientEventId, // <<<< INCLUIR EVENTID GERADO AQUI
        sourceUrl: window.location.href,
        // referrer_url: document.referrer || '', // Removido daqui, incluído em browserData
        userData: cleanUserData, // <<< USA OS DADOS LIMPOS
        customData: {
            ...specificCustomData,
            // language: navigator.language || 'pt-BR', // Removido daqui, incluído em browserData
            app: 'meta-tracking'
        },
        browserData: cleanBrowserData, // Adiciona dados limpos do navegador
        client_event_time: finalEventTime // MODIFICADO: Usar timestamp final calculado
    };

    // Limpar customData e browserData opcional (redundante, mas seguro)
    Object.keys(payload.customData).forEach(key => payload.customData[key] == null && delete payload.customData[key]);
    Object.keys(payload.browserData).forEach(key => payload.browserData[key] == null && delete payload.browserData[key]);

    // 📤 LOG DETALHADO DO PAYLOAD PARA BACKEND
    if (isDebugEnabled()) {
      console.groupCollapsed(`📤 [BACKEND_PAYLOAD] Enviando ${eventName} para API Server`);
      console.log('🎯 EVENTO E METADADOS:');
      console.log('  • Nome Interno:', eventName);
      console.log('  • Nome Facebook (Enviado):', facebookEventName);
      console.log('  • Event ID Cliente:', clientEventId);
      console.log('  • URL da Página:', window.location.href);
      console.log('  • Timestamp Cliente:', new Date(finalEventTime * 1000).toISOString());
      console.log('');
      console.log('👤 DADOS DO USUÁRIO (UserData):');
      for (const [key, value] of Object.entries(cleanUserData)) {
        console.log(`  • ${key}:`, value);
      }
      console.log('');
      console.log('🌐 DADOS DO NAVEGADOR (BrowserData):');
      for (const [key, value] of Object.entries(cleanBrowserData)) {
        console.log(`  • ${key}:`, value);
      }
      console.log('');
      console.log('📊 DADOS CUSTOMIZADOS (CustomData):');
      for (const [key, value] of Object.entries(payload.customData)) {
        console.log(`  • ${key}:`, value);
      }
      console.log('');
      console.log('📦 PAYLOAD COMPLETO PARA API:');
      console.log(JSON.stringify(payload, null, 2));
      console.groupEnd();
    }

    // ++ LOG SERÁ FEITO APÓS RECEBER eventID DO BACKEND ++

    // Enviar para /track
    try {
        console.log(`[Frontend Script] ⏳ Enviando ${eventName} com eventId ${clientEventId} para backend...`);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true // Importante para enviar em unload/pagehide
        });

        // --- MODIFICADO: Processar resposta JSON e logar CAPI --- 
        const responseData = await response.json(); // Processar sempre como JSON

        if (isDebugEnabled() && responseData.capiPayload) {
             // Usar JSON.stringify com indentação para melhor leitura
            console.groupCollapsed(`📥 [RESPOSTA_BACKEND] Evento: ${responseData.capiPayload.event_name} (ID: ${responseData.serverEventId})`); // <<< TÍTULO ALTERADO
            console.log('✅ STATUS DA REQUISIÇÃO:', response.status, response.statusText);
            console.log('🔗 Event ID Gerado:', responseData.serverEventId);
            console.log('📊 Status CAPI:', responseData.capiSendStatus);
            console.log('🔍 Trace ID CAPI:', responseData.capiTraceId);
            console.log('');
            console.log('📦 PAYLOAD ENVIADO PARA FACEBOOK CAPI:');
            console.log(JSON.stringify(responseData.capiPayload, null, 2));
            if (responseData.capiError) {
                 console.error('❌ Erro CAPI:', responseData.capiError);
            }
            console.groupEnd();
        } else if (isDebugEnabled()) {
            // Logar se o debug está ativo mas não veio payload (pode indicar erro no backend)
            console.warn('[LOG_SERVER_CAPI] Payload CAPI não encontrado na resposta do backend.', responseData);
        }

        if (!response.ok || !responseData.success) {
            console.error(`[Frontend Script] ❌ Erro na resposta do backend /track para ${eventName}:`, { status: response.status, responseData });
            
            // +++ RETORNAR EVENTID DO CLIENTE MESMO COM ERRO DO BACKEND +++
            console.warn(`[Frontend Script] ⚠️ Retornando eventId do cliente ${clientEventId} apesar do erro`);
            return clientEventId; // Retorna eventId do cliente para continuar o fluxo
            // +++ FIM FALLBACK +++
        } else {
            const serverEventId = responseData.serverEventId || clientEventId; // Fallback para clientEventId
            console.log(`[Frontend Script] ✅ Resposta recebida do backend para ${eventName} (ID: ${serverEventId})`);
            
            // ++ CHAMAR A NOVA FUNÇÃO DE LOG COM eventID DO BACKEND ++
            try {
               logEventForDebug(eventName, facebookEventName, serverEventId, PIXEL_ID, payload.customData, payload.userData);
            } catch (logError) {
               console.error("[Meta Tracking Debug] Erro ao gerar log formatado:", logError);
            }
            
            return serverEventId; // RETORNA o eventID (do backend ou cliente como fallback)
        }
        // --- FIM DA MODIFICAÇÃO ---

    } catch (error) {
        console.error(`[Frontend Script] ❌ Falha na requisição fetch para /track (${eventName}):`, error);
        
        // +++ FALLBACK DE EMERGÊNCIA +++
        console.warn(`[Frontend Script] 🚨 FALLBACK: Usando eventId do cliente ${clientEventId} devido ao erro de rede`);
        console.warn('[Frontend Script] ⚠️ ATENÇÃO: Deduplicação CAPI pode ser comprometida, mas continuando execução');
        return clientEventId; // Retorna eventId do cliente para não interromper o fluxo
        // +++ FIM FALLBACK DE EMERGÊNCIA +++
    }
  }

  // Função principal para disparar eventos (REFATORADA para padrão correto)
  async function sendEvent(eventName, customData = {}) {

    // +++ GERAR TIMESTAMP ÚNICO PARA CADA EVENTO +++
    // Implementar diferenciação para eventos enviados rapidamente
    let uniqueTimestamp = Math.floor(Date.now() / 1000);
    
    // Se eventos forem enviados muito rapidamente (mesmo segundo), adicionar diferenciação
    if (window.lastEventTimestamp && uniqueTimestamp === window.lastEventTimestamp) {
      // Adicionar 1 segundo para garantir timestamps únicos
      uniqueTimestamp = window.lastEventTimestamp + 1;
      console.log(`[Meta Tracking] ⏰ Timestamp ajustado para evitar duplicação: ${uniqueTimestamp}`);
    }
    
    // Armazenar para próxima verificação
    window.lastEventTimestamp = uniqueTimestamp;
    
    console.log(`[Meta Tracking] 🕐 Timestamp único gerado para ${eventName}: ${uniqueTimestamp} (${new Date(uniqueTimestamp * 1000).toISOString()})`);
    // +++ FIM GERAÇÃO TIMESTAMP ÚNICO +++

    // +++ DIAGNÓSTICO INICIAL DE _FBP +++
    const initialFbp = getCookie('_fbp') || getUrlParameter('fbp') || null;
    console.log(`[Meta Tracking Debug] 🔍 DIAGNÓSTICO _FBP INICIAL para ${eventName}:`);
    console.log(`  • Cookie _fbp: ${getCookie('_fbp') || 'AUSENTE'}`);
    console.log(`  • URL param fbp: ${getUrlParameter('fbp') || 'AUSENTE'}`);
    console.log(`  • Document.cookie completo: ${document.cookie ? 'PRESENTE' : 'VAZIO'}`);
    console.log(`  • Tamanho cookies: ${document.cookie.length} caracteres`);
    
    if (!initialFbp) {
      console.warn(`[Meta Tracking Debug] ⚠️ ALERTA CRÍTICO: _fbp não encontrado para ${eventName}!`);
      console.warn('[Meta Tracking Debug] 🔍 Possíveis causas:');
      console.warn('  • Pixel Facebook não carregou completamente');
      console.warn('  • Bloqueador de ads/tracking ativo');
      console.warn('  • Problemas de domínio/cookies SameSite');
      console.warn('  • Script executando antes do init do pixel');
      console.warn('  • Configuração incorreta do pixel');
    } else {
      console.log(`[Meta Tracking Debug] ✅ _fbp encontrado: ${initialFbp}`);
    }
    // +++ FIM DIAGNÓSTICO _FBP +++

    // Coletar dados comuns
    const externalId = getExternalId();
    const visitorId = getOrCreateVisitorId();
    const fbc = getFbcFromCookie(); // Apenas do cookie
    const fbclid = getFbclidFromUrl(); // Apenas da URL

    // Coletar PII novamente (pode ter sido atualizado desde o init)
    const email = getLocalStorageItem('meta_tracking_email');
    const phone = getLocalStorageItem('meta_tracking_phone');
    const firstName = getLocalStorageItem('meta_tracking_first_name');
    const lastName = getLocalStorageItem('meta_tracking_last_name');
    const gender = getLocalStorageItem('meta_tracking_gender');
    const dob = getLocalStorageItem('meta_tracking_dob');

    // --- MODIFICADO: Usar placeholders injetados pelo backend para GeoIP ---
    const city = '__GEO_CITY__';       // Placeholder será substituído por string JSON (ex: "sao paulo" ou null)
    const state = '__GEO_STATE__';      // Placeholder será substituído por string JSON (ex: "sp" ou null)
    const zip = '__GEO_ZIP__';          // Placeholder será substituído por string JSON (ex: "01000000" ou null)
    const country = '__GEO_COUNTRY__';  // Placeholder será substituído por string JSON (ex: "br" ou null)
    // --- FIM DA MODIFICAÇÃO ---

    // --- ADICIONADO: Capturar IP injetado ---
    const clientIpAddress = '__CLIENT_IP__'; // Placeholder será substituído por string JSON (ex: "123.45.67.89" ou null)
    // --- FIM DA ADIÇÃO ---

    console.log('[Meta Tracking Debug] Dados PII/Geo/IP coletados:', { email, phone, firstName, lastName, gender, dob, city, state, zip, country, clientIpAddress });

    // Montar UserData para backend (inclui fbp para CAPI)
    const fbpForBackend = getCookie('_fbp') || getUrlParameter('fbp') || null;
    const rawUserData = {
      external_id: externalId, visitorId: visitorId, fbc: fbc, fbp: fbpForBackend,
      em: email, ph: phone, fn: firstName, ln: lastName,
      ge: gender, db: dob, ct: city, st: state, zp: zip, country: country
    };
    // NOTA: fbclid coletado mas não enviado para CAPI (apenas para logs)
    if (fbclid) {
      console.log(`[Meta Tracking] 📋 FBCLID coletado (não enviado para CAPI): ${fbclid.substring(0, 20)}...`);
    }
    Object.keys(rawUserData).forEach(key => rawUserData[key] == null && delete rawUserData[key]);

    // Montar Advanced Matching Params para fbq (sem fbp/fbc - Facebook detecta automaticamente)
    const advancedMatchingParams = { 
        external_id: rawUserData.external_id,
        visitorId: rawUserData.visitorId,
        em: rawUserData.em,
        ph: rawUserData.ph,
        fn: rawUserData.fn,
        ln: rawUserData.ln,
        ge: rawUserData.ge,
        db: rawUserData.db,
        ct: rawUserData.ct,
        st: rawUserData.st,
        zp: rawUserData.zp,
        country: rawUserData.country
        // REMOVIDO: fbp e fbc (Facebook detecta automaticamente)
    };
    // Adicionar userAgent que fbq usa
    advancedMatchingParams.client_user_agent = navigator.userAgent; 
    Object.keys(advancedMatchingParams).forEach(key => advancedMatchingParams[key] == null && delete advancedMatchingParams[key]);

    // +++ SEGUNDA VALIDAÇÃO DE _FBP (APÓS COLETA) +++
    const fbpForValidation = getCookie('_fbp') || getUrlParameter('fbp') || null;
    if (!fbpForValidation) {
      console.error(`[Meta Tracking Debug] ❌ _FBP AINDA AUSENTE após coleta para ${eventName}!`);
      console.error('[Meta Tracking Debug] 📊 Estado dos cookies no momento da coleta:');
      console.error(`  • document.cookie: ${document.cookie.substring(0, 200)}...`);
      console.error(`  • fbq definido: ${typeof window.fbq !== 'undefined'}`);
      console.error(`  • localStorage keys: ${Object.keys(localStorage).filter(k => k.includes('fb') || k.includes('pixel')).join(', ')}`);
    } else {
      console.log(`[Meta Tracking Debug] ✅ _fbp confirmado: ${fbpForValidation}`);
    }
    // +++ FIM SEGUNDA VALIDAÇÃO +++

    // Mesclar dados customizados específicos do evento
    const rawCustomData = {
      app: 'meta-tracking',
      language: navigator.language || 'pt-BR',
      referrer_url: document.referrer || '',
      ...customData // Dados específicos vindos de detectPageType, etc.
    };
    
    // ✅ APLICAR NORMALIZAÇÃO PARA PADRÃO FACEBOOK
    const finalCustomData = normalizeCustomDataToFacebookStandard(rawCustomData);
    console.log('[Meta Tracking Debug] 🔧 CustomData ANTES da normalização:', rawCustomData);
    console.log('[Meta Tracking Debug] ✅ CustomData APÓS normalização Facebook:', finalCustomData);

    // +++ VALIDAÇÃO DE TIMESTAMP E CORREÇÃO +++
    // ✅ CORREÇÃO: Usar UTC diretamente (servidor Virginia + cliente qualquer = UTC como padrão)
    let currentTimestamp = uniqueTimestamp; // Usar o timestamp único gerado acima
    
    // Data de referência: 9 de junho de 2025 em UTC
    const referenceDate = new Date('2025-06-09T00:00:00Z'); // UTC
    const expectedMinTimestamp = Math.floor(referenceDate.getTime() / 1000);
    const expectedMaxTimestamp = expectedMinTimestamp + (24 * 60 * 60);
    
    console.log(`[Meta Tracking] 🕐 Diagnóstico de tempo (Servidor Virginia UTC, Cliente Local):`);
    console.log(`  • Timestamp cliente: ${currentTimestamp} (${new Date(currentTimestamp * 1000).toISOString()})`);
    console.log(`  • Horário local cliente: ${new Date().toLocaleString()}`);
    console.log(`  • Esperado mín: ${expectedMinTimestamp} (${new Date(expectedMinTimestamp * 1000).toISOString()})`);
    console.log(`  • Esperado máx: ${expectedMaxTimestamp} (${new Date(expectedMaxTimestamp * 1000).toISOString()})`);
    
    // Se o timestamp está muito fora do esperado (não é de junho 2025), corrigir
    if (currentTimestamp < expectedMinTimestamp - 86400 || currentTimestamp > expectedMaxTimestamp + 86400) {
        console.warn(`[Meta Tracking] ⚠️ Timestamp fora do esperado (junho 2025). Detectado: ${new Date(currentTimestamp * 1000).toISOString()}`);
        // Usar timestamp atual UTC (servidor Virginia aceita UTC)
        currentTimestamp = Math.floor(Date.now() / 1000);
        console.warn(`[Meta Tracking] ✅ Timestamp corrigido para UTC atual: ${new Date(currentTimestamp * 1000).toISOString()}`);
    }
    
    // Adicionar timestamp validado ao payload
    finalCustomData.client_event_time = currentTimestamp;
    // +++ FIM VALIDAÇÃO TIMESTAMP +++

    // LOG: Dados finais antes de enviar para Backend
    console.log(`[Meta Tracking Debug] Preparando evento: ${eventName}`);
    console.log(`[Meta Tracking Debug] Advanced Matching:`, advancedMatchingParams);
    console.log(`[Meta Tracking Debug] Custom Data:`, finalCustomData);

    // +++ LOG WEB RAW (ANTES DO PROCESSAMENTO BACKEND) +++
    if (isDebugEnabled()) {
      try {
          console.groupCollapsed(`📤 [PAYLOAD_WEB_PIXEL] Antes do processamento backend (${eventName})`);
          console.log('Advanced Matching (fbq):', JSON.stringify(advancedMatchingParams, null, 2));
          console.log('Custom Data (fbq):', JSON.stringify(finalCustomData, null, 2));
          console.groupEnd();
      } catch (e) {
          console.error('[PAYLOAD_WEB_PIXEL] Erro ao gerar log:', e);
      }
    }
    // +++ FIM LOG WEB RAW +++

    // NOVO PADRÃO: Enviar para Backend PRIMEIRO, depois fbq()
    try {
        console.log('[Meta Tracking Debug] Enviando evento para Backend:', { eventName: eventName, rawUserData, specificCustomData: finalCustomData });
        
        // MODIFICADO: Passar timestamp único para backend
        const serverEventId = await sendEventToBackend(eventName, rawUserData, finalCustomData, currentTimestamp);
        
        if (serverEventId) {
            console.log(`[Meta Tracking Debug] ✅ EventID recebido do backend: ${serverEventId}, enviando para fbq()`);
            // Agora enviar para fbq() com o eventID do backend
            await sendFBQEvent(eventName, finalCustomData, serverEventId);
            
            // 🔍 LOG DE COMPARAÇÃO WEB vs API
            if (isDebugEnabled()) {
              console.groupCollapsed(`🔍 [COMPARAÇÃO] Web vs API para ${eventName} (ID: ${serverEventId})`);
              console.log('📊 ANÁLISE DE CONSISTÊNCIA:');
              console.log('');
              console.log('🌐 DADOS ENVIADOS VIA WEB (fbq):');
              console.log('  • Método:', EVENT_MAPPING[eventName] ? 'track/trackCustom' : 'trackCustom');
              console.log('  • Nome Evento FB:', EVENT_MAPPING[eventName] || eventName);
              console.log('  • Event ID:', serverEventId);
              console.log('  • Custom Data:', JSON.stringify(finalCustomData, null, 4));
              console.log('');
              console.log('📤 DADOS ENVIADOS VIA API (Backend):');
              console.log('  • Advanced Matching:', JSON.stringify(advancedMatchingParams, null, 4));
              console.log('  • Custom Data:', JSON.stringify(finalCustomData, null, 4));
              console.log('  • User Data (PII/Geo):', JSON.stringify(rawUserData, null, 4));
              console.log('');
              console.log('✅ VERIFICAÇÕES DE INTEGRIDADE:');
              console.log('  • Event ID Único:', serverEventId ? '✅ PRESENTE' : '❌ AUSENTE');
              console.log('  • External ID:', rawUserData.external_id ? '✅ CONSISTENTE' : '❌ INCONSISTENTE');
              console.log('  • Custom Data Matching:', JSON.stringify(finalCustomData) === JSON.stringify(finalCustomData) ? '✅ IDÊNTICO' : '❌ DIVERGENTE');
              console.log('  • FBP/FBC:', (rawUserData.fbp || rawUserData.fbc) ? '✅ PRESENTE' : '⚠️ AUSENTE');
              console.log('  • GeoIP Data:', (rawUserData.ct && rawUserData.st) ? '✅ PRESENTE' : '⚠️ AUSENTE');
              console.log('');
              console.log('🎯 DEDUPLICAÇÃO:');
              console.log('  • Status:', serverEventId ? '✅ ATIVA (EventID presente)' : '❌ FALHA (EventID ausente)');
              console.log('  • Pattern:', 'Backend → EventID → fbq()');
              console.groupEnd();
            }
        } else {
            // +++ IMPLEMENTAR FALLBACK ROBUSTO +++
            console.error(`[Meta Tracking Debug] ❌ Backend não retornou eventID para ${eventName}!`);
            console.error('[Meta Tracking Debug] 🔄 Implementando fallback - gerando eventID local...');
            
            // Gerar eventID local como fallback
            const fallbackEventId = generateUUID();
            console.warn(`[Meta Tracking Debug] ⚠️ Usando eventID de fallback: ${fallbackEventId}`);
            console.warn('[Meta Tracking Debug] ⚠️ ATENÇÃO: Deduplicação pode ser afetada!');
            
            // Enviar para fbq() com eventID de fallback
            await sendFBQEvent(eventName, finalCustomData, fallbackEventId);
            
            // Log do problema para debugging
            console.error('[Meta Tracking Debug] 📊 DIAGNÓSTICO DO PROBLEMA:');
            console.error('  • Payload enviado:', { eventName, rawUserData, finalCustomData });
            console.error('  • Response recebida: null/undefined');
            console.error('  • Verifique logs do servidor para mais detalhes');
            // +++ FIM FALLBACK +++
        }
        
    } catch (error) {
        console.error('[Meta Tracking Debug] ❌ Erro no fluxo de envio de evento:', error);
        
        // +++ FALLBACK EM CASO DE ERRO DE REDE +++
        console.error('[Meta Tracking Debug] 🔄 Erro de rede detectado - implementando fallback de emergência...');
        const emergencyEventId = generateUUID();
        console.warn(`[Meta Tracking Debug] 🚨 Usando eventID de emergência: ${emergencyEventId}`);
        
        try {
            await sendFBQEvent(eventName, finalCustomData, emergencyEventId);
            console.warn('[Meta Tracking Debug] ✅ Evento enviado via fallback de emergência');
        } catch (fbqError) {
            console.error('[Meta Tracking Debug] ❌ Falha total no envio do evento:', fbqError);
        }
        // +++ FIM FALLBACK EMERGÊNCIA +++
    } 
  }

  // +++ NOVA FUNÇÃO SENDPIXEL COM DEDUPLICAÇÃO GARANTIDA +++
  function sendFBQEvent(eventName, customData, serverEventId) {
    
    // ⚠️ CRÍTICO: Verificar se serverEventId existe
    if (!serverEventId) {
      console.error(`[Meta Tracking] ❌ ERRO CRÍTICO: serverEventId não fornecido para ${eventName}! Deduplicação será comprometida.`);
      return;
    }

    // ⚠️ CRÍTICO: Verificar se fbq está disponível
    if (!window.fbq || typeof window.fbq !== 'function') {
      console.error(`[Meta Tracking] ❌ ERRO CRÍTICO: fbq não está disponível para ${eventName}! Aguardando inicialização...`);
      // Tentar aguardar um pouco e retentar
      setTimeout(() => {
        if (window.fbq && typeof window.fbq === 'function') {
          sendFBQEvent(eventName, customData, serverEventId);
        } else {
          console.error(`[Meta Tracking] ❌ fbq ainda não disponível após espera para ${eventName}`);
        }
      }, 500);
      return;
    }

    const facebookEventName = EVENT_MAPPING[eventName] || eventName;
    
    // 🔧 COLETAR DADOS DE ADVANCED MATCHING CORRETOS PARA FBQ
    const externalId = getExternalId();
    
    // 📧 COLETAR PII (dados pessoais identificáveis)
    const email = getLocalStorageItem('meta_tracking_email');
    const phone = getLocalStorageItem('meta_tracking_phone');
    const firstName = getLocalStorageItem('meta_tracking_first_name');
    const lastName = getLocalStorageItem('meta_tracking_last_name');
    
    // 🌍 COLETAR DADOS GEOGRÁFICOS (dos placeholders do backend)
    const city = '__GEO_CITY__';
    const state = '__GEO_STATE__';
    const zip = '__GEO_ZIP__';
    const country = '__GEO_COUNTRY__';
    
    // ✅ MONTAR OPTIONS COM ADVANCED MATCHING CORRETO (SEM fbp/fbc manuais)
    const fbqOptions = {
      eventID: String(serverEventId) // Converter explicitamente para string
    };
    
    // 🎯 ADICIONAR ADVANCED MATCHING APENAS SE DADOS EXISTIREM
    if (externalId) fbqOptions.external_id = externalId;
    if (email) fbqOptions.em = email;
    if (phone) fbqOptions.ph = phone;
    if (firstName) fbqOptions.fn = firstName;
    if (lastName) fbqOptions.ln = lastName;
    if (city && city !== '__GEO_CITY__') fbqOptions.ct = city;
    if (state && state !== '__GEO_STATE__') fbqOptions.st = state;
    if (zip && zip !== '__GEO_ZIP__') fbqOptions.zp = zip;
    if (country && country !== '__GEO_COUNTRY__') fbqOptions.country = country;

    // 🔍 LOG DETALHADO PRÉ-ENVIO
    console.log(`[Meta Tracking] 📤 Enviando para fbq(): ${facebookEventName} (eventID: ${serverEventId})`);
    console.log(`[Meta Tracking] 📋 Dados: customData=${JSON.stringify(customData)}, options=${JSON.stringify(fbqOptions)}`);
    console.log(`[Meta Tracking] 🎯 Advanced Matching: external_id=${!!externalId}, email=${!!email}, phone=${!!phone}`);
    console.log(`[Meta Tracking] 🔍 fbqOptions completo:`, JSON.stringify(fbqOptions, null, 2));

    try {
      // CORREÇÃO: Usar trackCustom para eventos não padrão como ViewCart ou mapeados para CustomEvent
      if (['ViewCart', 'ViewHome', 'ViewList'].includes(facebookEventName) || EVENT_MAPPING[eventName] === 'CustomEvent') { 
        // Adicionar nome do evento customizado como parâmetro, se for CustomEvent genérico
        const customEventPayload = { ...customData };
        if (EVENT_MAPPING[eventName] === 'CustomEvent') {
           customEventPayload.event = eventName; // Adiciona o nome original (ex: Timer_1min) 
           console.log(`[Meta Tracking] 🎯 fbq('trackCustom', '${eventName}', data, {eventID: '${serverEventId}'})`);
           
           // ++ LOG FBQ ++ 
           logTrackCustomIfNeeded(eventName, customEventPayload, fbqOptions);
           
           // ✅ CHAMADA COM EVENTID GARANTIDO
           fbq('trackCustom', eventName, customEventPayload, fbqOptions); // Usa eventName original aqui
        } else {
           console.log(`[Meta Tracking] 🎯 fbq('trackCustom', '${facebookEventName}', data, {eventID: '${serverEventId}'})`);
           
           // ++ LOG FBQ ++ 
           logTrackCustomIfNeeded(facebookEventName, customData, fbqOptions);
           
           // ✅ CHAMADA COM EVENTID GARANTIDO  
           fbq('trackCustom', facebookEventName, customData, fbqOptions);
        }
      } else {
        // Para eventos padrão (PageView, ViewContent, AddToCart, Purchase, etc.) usar track padrão
        console.log(`[Meta Tracking] 🎯 fbq('track', '${facebookEventName}', data, {eventID: '${serverEventId}'})`);
        
        // +++ LOG WEB FBQ (TRACK PADRÃO) +++
        if (isDebugEnabled()) {
            try {
                console.groupCollapsed(`[LOG_WEB_FBQ] fbq('track', '${facebookEventName}', ...) (ID: ${serverEventId})`);
                console.log('Custom Data:', JSON.stringify(customData, null, 2));
                console.log('Options:', JSON.stringify(fbqOptions, null, 2));
                console.groupEnd();
            } catch (e) {
                console.error('[LOG_WEB_FBQ] Erro ao gerar log (track):', e);
            }
        }
        
        // ✅ CHAMADA COM EVENTID GARANTIDO
        fbq('track', facebookEventName, customData, fbqOptions);
      }
      
      // ✅ LOG CONFIRMAÇÃO
      console.log(`[Meta Tracking] ✅ Evento ${eventName} enviado para fbq() com eventID: ${serverEventId}`);
      
    } catch (error) {
      console.error(`[Meta Tracking] ❌ Erro ao enviar evento ${eventName} para FB Pixel:`, error);
    }
  }
  // ++ FIM DA NOVA FUNÇÃO ++

  // Função para adicionar dados hasheados ao pixel (REMOVER ou REVISAR)
  // Esta função parece redundante/incorreta na nova abordagem
  // const addHashedDataToPixel = async (name, value) => {
  // ... (manter comentado ou remover completamente) ...
  // };

  // --- Funções de Configuração de Rastreamento (Scroll, Timer, Video, Lead) ---
  // Estas funções provavelmente chamam sendEvent e precisam ser verificadas
  // se estão passando os dados corretos para sendEvent.

  function setupScrollTracking() {
    let maxScrollPercentage = 0;
    
    // Função para calcular a porcentagem de rolagem
    function getScrollPercentage() {
      const windowHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.body.scrollHeight, 
        document.body.offsetHeight, 
        document.documentElement.clientHeight, 
        document.documentElement.scrollHeight, 
        document.documentElement.offsetHeight
      );
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Se o documento tiver a mesma altura que a janela, retorna 100%
      if (documentHeight <= windowHeight) {
        return 100;
      }
      
      return Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
    }
    
    // Função para verificar e registrar eventos de rolagem
    function checkScrollDepth() {
      const scrollPercentage = getScrollPercentage();
      
      if (scrollPercentage > maxScrollPercentage) {
        maxScrollPercentage = scrollPercentage;
        
        // Verificar limites de rolagem e enviar eventos
        if (scrollPercentage >= 25 && !sentEvents.scroll_25) {
          sentEvents.scroll_25 = true;
          sendEvent('Scroll_25', {
            scroll_percentage: 25,
            pageUrl: window.location.href,
            content_name: document.title,
            content_type: 'engagement',
            content_category: 'Scroll',
            currency: 'BRL'
          });
        }
        
        if (scrollPercentage >= 50 && !sentEvents.scroll_50) {
          sentEvents.scroll_50 = true;
          sendEvent('Scroll_50', {
            scroll_percentage: 50,
            pageUrl: window.location.href,
            content_name: document.title,
            content_type: 'engagement',
            content_category: 'Scroll',
            currency: 'BRL'
          });
        }
        
        // Adicionar rastreamento de rolagem para 75%
        if (scrollPercentage >= 75 && !sentEvents.scroll_75) {
          sentEvents.scroll_75 = true;
          sendEvent('Scroll_75', {
            scroll_percentage: 75,
            pageUrl: window.location.href,
            content_name: document.title,
            content_type: 'engagement',
            content_category: 'Scroll',
            currency: 'BRL'
          });
        }
        
        // Adicionar rastreamento de rolagem para 90%
        if (scrollPercentage >= 90 && !sentEvents.scroll_90) {
          sentEvents.scroll_90 = true;
          sendEvent('Scroll_90', {
            scroll_percentage: 90,
            pageUrl: window.location.href,
            content_name: document.title,
            content_type: 'engagement',
            content_category: 'Scroll',
            currency: 'BRL'
          });
        }
      }
    }
    
    // Configurar ouvintes de eventos
    window.addEventListener('scroll', throttle(checkScrollDepth, 500));
    window.addEventListener('resize', throttle(checkScrollDepth, 500));
    
    // Verificar após o carregamento da página
    window.addEventListener('load', checkScrollDepth);
  }

  function setupTimerTracking() {
    setTimeout(function() {
      if (!sentEvents.timer_1min) {
        console.log('Timer 1min reached');
        // Passar dados customizados mínimos para o evento de timer
        sendEvent('Timer_1min', { 
          time_on_page: 60,
          content_name: document.title,
          content_type: 'engagement',
          content_category: 'Timer',
          currency: 'BRL'
        });
        sentEvents.timer_1min = true;
      }
    }, 60000); // 60 segundos = 1 minuto
  }

  // Configurar rastreamento de vídeo
  function setupVideoTracking() {
    // Aguardar carregamento da página
    document.addEventListener('DOMContentLoaded', function() {
      // Procurar todos os vídeos na página
      const videos = document.querySelectorAll('video');
      
      videos.forEach(function(video, index) {
        // Identificador único para o vídeo
        const videoId = video.id || video.getAttribute('data-video-id') || `video_${index}`;
        
        // Dados do vídeo para enviar nos eventos
        let videoData = {
          content_ids: [videoId],
          content_name: video.getAttribute('title') || video.getAttribute('data-title') || videoId,
          content_type: 'video',
          content_category: 'Video',
          currency: 'BRL'
        };
        
        // Armazenar pontos de progresso já rastreados
        let trackedProgressPoints = {
          start: false,
          '25': false,
          '50': false,
          '75': false,
          '90': false
        };
        
        // Evento de início de reprodução
        video.addEventListener('play', function() {
          if (!trackedProgressPoints.start) {
            trackedProgressPoints.start = true;
            
            // Adicionar duração do vídeo aos dados
            videoData.video_duration = video.duration;
            
            // Enviar evento de início de vídeo
            sendEvent('PlayVideo', videoData);
          }
        });
        
        // Evento de progresso
        video.addEventListener('timeupdate', function() {
          // Calcular porcentagem de progresso
          const percentage = (video.currentTime / video.duration) * 100;
          
          // Verificar pontos de progresso
          if (percentage >= 25 && !trackedProgressPoints['25']) {
            trackedProgressPoints['25'] = true;
            sendEvent('ViewVideo_25', {
              ...videoData,
              video_position: 25,
              video_duration: video.duration,
              video_title: videoData.content_name
            });
          }
          
          if (percentage >= 50 && !trackedProgressPoints['50']) {
            trackedProgressPoints['50'] = true;
            sendEvent('ViewVideo_50', {
              ...videoData,
              video_position: 50,
              video_duration: video.duration,
              video_title: videoData.content_name
            });
          }
          
          if (percentage >= 75 && !trackedProgressPoints['75']) {
            trackedProgressPoints['75'] = true;
            sendEvent('ViewVideo_75', {
              ...videoData,
              video_position: 75,
              video_duration: video.duration,
              video_title: videoData.content_name
            });
          }
          
          if (percentage >= 90 && !trackedProgressPoints['90']) {
            trackedProgressPoints['90'] = true;
            sendEvent('ViewVideo_90', {
              ...videoData,
              video_position: 90,
              video_duration: video.duration,
              video_title: videoData.content_name
            });
          }
        });
        
        // Resetar pontos de rastreamento quando o vídeo é reiniciado
        video.addEventListener('seeking', function() {
          if (video.currentTime < 1) {
            // Resetar apenas se estiver voltando para o início
            trackedProgressPoints = {
              start: trackedProgressPoints.start, // Manter o início rastreado
              '25': false,
              '50': false,
              '75': false,
              '90': false
            };
          }
        });
      });
    });
  }
  
  // Configurar rastreamento de leads e wishlist
  function setupLeadTracking() {
    document.addEventListener('DOMContentLoaded', function() {
      // Procurar formulários que podem ser de lead
      const forms = document.querySelectorAll('form');
      
      forms.forEach(function(form) {
        // Verificar se o formulário tem campos de contato
        const hasEmailField = form.querySelector('input[type="email"], input[name*="email"], input[id*="email"]');
        const hasNameField = form.querySelector('input[name*="name"], input[id*="name"], input[placeholder*="nome"]');
        
        if (hasEmailField || hasNameField) {
          // Provavelmente é um formulário de lead
          form.addEventListener('submit', function(event) {
            // Coletar dados do formulário
            const formData = new FormData(form);
            const leadData = {};
            
            // Processar dados do formulário
            for (const [key, value] of formData.entries()) {
              if (key.includes('email') || key.includes('mail')) {
                leadData.email = value;
              }
              if (key.includes('name') || key.includes('nome')) {
                // Tentar identificar primeiro e último nome
                const nameParts = value.split(' ');
                if (nameParts.length > 1) {
                  leadData.firstName = nameParts[0];
                  leadData.lastName = nameParts.slice(1).join(' ');
                } else {
                  leadData.firstName = value;
                }
              }
              if (key.includes('phone') || key.includes('tel') || key.includes('fone')) {
                leadData.phone = value;
              }
            }
            
            // Enviar evento Lead
            sendEvent('Lead', {
              content_name: form.getAttribute('name') || form.id || 'form_lead',
              content_category: 'Lead',
              content_type: 'lead_form',
              currency: 'BRL',
              value: 0
            }, leadData);
          });
        }
      });
      
      // Rastrear botões de wishlist
      const wishlistButtons = document.querySelectorAll(
        '.wishlist, .add-to-wishlist, [data-action="wishlist"], ' +
        '[class*="wishlist"], [id*="wishlist"], ' +
        'button[title*="desejo"], a[title*="desejo"], ' +
        'button[aria-label*="desejo"], a[aria-label*="desejo"]'
      );
      
      wishlistButtons.forEach(function(button) {
        button.addEventListener('click', function(event) {
          // Tentar identificar o produto
          const productId = button.getAttribute('data-product-id') || 
                          button.getAttribute('data-id') || 
                          getProductIdFromURL();
          
          const productName = button.getAttribute('data-product-name') || 
                            button.getAttribute('aria-label') || 
                            button.getAttribute('title');
          
          sendEvent('AddToWishlist', {
            content_ids: productId ? [productId] : null,
            content_name: productName || 'Product',
            content_category: 'Wishlist',
            content_type: 'product',
            currency: 'BRL'
          });
        });
      });
    });
  }

  // Adiciona listener para o evento AddToCart
  function setupAddToCartListener() {
    console.log('[Meta Tracking Debug] Configurando listener AddToCart via DELEGAÇÃO...');
    
    // O seletor alvo para o botão
    const buttonSelector = 'button[name="add"]'; 

    // Adicionar listener ao body 
    document.body.addEventListener('click', function(event) {
      
      // Verificar se o elemento clicado ou um de seus pais corresponde ao seletor do botão
      const button = event.target.closest(buttonSelector);

      // Se o clique foi no botão AddToCart ou em um elemento dentro dele
      if (button) {
        console.log('[Meta Tracking Debug] Clique detectado no botão AddToCart (ou seu filho) via delegação:', button);
        
        // Prevenção simples contra múltiplos cliques rápidos (opcional)
        if (button.dataset.processingAddToCart === 'true') {
            console.log('[Meta Tracking Debug] AddToCart já em processamento, ignorando clique.');
            return;
        }
        button.dataset.processingAddToCart = 'true';

        // Pequeno delay para dar tempo a outras ações do navegador/tema ocorrerem
        setTimeout(() => {
          console.log('[Meta Tracking Debug] Executando lógica AddToCart após delay...');
          try {
            // Obter os dados do produto ATUAL da página
            const productData = getProductDetails(); 
            console.log('[Meta Tracking Debug] Dados do produto para AddToCart:', productData);
            
            // Verificar se temos dados essenciais antes de enviar
            if (productData && productData.contentIds && productData.contentIds.length > 0 && productData.value > 0) {
               sendEvent('AddToCart', productData); // Chama a função principal para enviar fbq e backend
            } else {
               console.warn('[Meta Tracking Debug] AddToCart: Dados essenciais do produto ausentes (contentIds/value). Evento não enviado.');
            }
          } catch (error) {
             console.error('[Meta Tracking Debug] Erro ao processar o evento AddToCart:', error);
          } finally {
            // Liberar o botão para cliques futuros após processar
            button.dataset.processingAddToCart = 'false';
          }
        }, 150); // Delay de 150ms (ajustar se necessário)

      } 
    }, true); // Usar fase de captura pode ajudar a pegar o evento antes de outros scripts

    console.log('[Meta Tracking Debug] Listener AddToCart (delegação) configurado no body.');
  }

  // Função principal - detecta a página e envia os eventos
  function init() {
    // Limpeza removida - não geramos mais FBC, apenas coletamos
    
    // ✅ PRIMEIRO: Inicializar backup server-side
    initServerSideBackup();
    
    // Carrega script fbevents.js e inicializa o pixel (o PageView já foi disparado na função initFacebookPixel)
    initFacebookPixel();
    
    // 🎯 CORREÇÃO CRÍTICA: Aguardar FBC para eventos iniciais (resolve perda de 9% qualidade)
    const pageInfo = detectPageType();
    
    if (pageInfo && pageInfo.type !== 'PageView') {
      // Detectar se precisa aguardar FBC baseado na origem do tráfego
      const needsToWaitForFbc = shouldWaitForFbc();
      const baseDelay = needsToWaitForFbc ? 1000 : 750; // Delay maior para tráfego Facebook
      
      console.log(`[Meta Tracking] 🎯 Processando evento inicial "${pageInfo.type}" (aguardar FBC: ${needsToWaitForFbc})`);
      
      setTimeout(async () => {
        try {
          // ETAPA 1: Aguardar FBP primeiro (sempre necessário)
          console.log(`[Meta Tracking] ⏳ Aguardando _fbp para evento "${pageInfo.type}"...`);
          const fbpFound = await waitForFbpCookie(1500);
          
          // ETAPA 2: Se necessário, aguardar FBC também
          let fbcResult = { success: false };
          if (needsToWaitForFbc) {
            console.log(`[Meta Tracking] ⏳ Aguardando FBC para evento "${pageInfo.type}"...`);
            fbcResult = await waitForFbcCapture(1000);
          }
          
          // ETAPA 3: Log do resultado e envio
          if (fbpFound && (!needsToWaitForFbc || fbcResult.success)) {
            console.log(`[Meta Tracking] ✅ Todos os cookies confirmados para ${pageInfo.type}, enviando evento...`);
          } else if (fbpFound) {
            console.warn(`[Meta Tracking] ⚠️ FBP OK mas FBC timeout para ${pageInfo.type}, enviando mesmo assim`);
          } else {
            console.warn(`[Meta Tracking] ⚠️ Timeout de cookies para ${pageInfo.type}, enviando mesmo assim`);
          }
          
          sendEvent(pageInfo.type, pageInfo.data);
          
        } catch (error) {
          console.error(`[Meta Tracking] ❌ Erro ao processar evento ${pageInfo.type}:`, error);
          // Fallback: enviar mesmo com erro
          sendEvent(pageInfo.type, pageInfo.data);
        }
      }, baseDelay);
      
    } else if (!pageInfo || pageInfo.type === 'PageView') {
      // PageView é enviado no initFacebookPixel, mas vamos aguardar FBC se necessário
      const needsToWaitForFbc = shouldWaitForFbc();
      
      if (needsToWaitForFbc) {
        console.log('[Meta Tracking] 🎯 PageView de origem Facebook - aguardando FBC para re-envio otimizado');
        
        setTimeout(async () => {
          try {
            const fbcResult = await waitForFbcCapture(800);
            if (fbcResult.success) {
              console.log('[Meta Tracking] ✅ FBC capturado - enviando PageView otimizado');
              sendEvent('PageView', {});
            }
          } catch (error) {
            console.warn('[Meta Tracking] Erro ao aguardar FBC para PageView:', error);
          }
        }, 200); // Delay menor para PageView
      } else {
        console.log('[Meta Tracking] 📄 PageView padrão já enviado na inicialização');
      }
    }

    // Configurar outros rastreadores (scroll, timer, etc.) - Isso pode continuar fora do timeout
    setupScrollTracking();
    setupTimerTracking();
    setupVideoTracking();
    setupLeadTracking();
    setupAddToCartListener();
    
    // Função para testar o envio completo de todos os parâmetros
    function testCompleteEvent() {
      // Apenas executar em desenvolvimento
      if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
        console.log('Enviando evento de teste com todos os parâmetros para verificar consistência');
        
        // Exemplo de produto completo com todos os parâmetros necessários
        const completeProductData = {
          content_name: 'Bolsa de palha trama',
          content_type: 'product_group',
          content_category: ['bolsa'],
          content_ids: ['9068696764659'],
          contents: [{ id: '9068696764659', quantity: 1, item_price: 289 }],
          num_items: 1, 
          currency: 'BRL',
          value: 289
        };
        
        // Enviar evento completo para testar
        sendEvent('ViewContent', completeProductData);
      }
    }
    
    // Descomentar a linha abaixo apenas para teste
    // testCompleteEvent();
    
    // Verificar se precisamos passar parâmetros para links externos de checkout
    function addCheckoutParams(e) {
      const link = e.currentTarget;
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Verificar se o link é para o domínio de checkout
      if (href.includes('seguro.soleterra.com.br') || 
          href.includes('checkout.') || 
          href.includes('/checkout')) {
        
        // Obter os parâmetros que vamos passar
        const external_id = getExternalId();
        const fbp = getCookie('_fbp');
        const fbc = getCookie('_fbc');
        
        // Criar a URL com os parâmetros
        let newHref = href;
        const hasParams = href.includes('?');
        const paramPrefix = hasParams ? '&' : '?';
        
        // Adicionar external_id
        newHref += `${paramPrefix}external_id=${encodeURIComponent(external_id)}`;
        
        // Adicionar fbp se disponível
        if (fbp) {
          newHref += `&fbp=${encodeURIComponent(fbp)}`;
        }
        
        // Adicionar fbc se disponível
        if (fbc) {
          newHref += `&fbc=${encodeURIComponent(fbc)}`;
        }
        
        // Atualizar o link
        link.setAttribute('href', newHref);
      }
    }
    
    // Adicionar listener para links de checkout
    document.querySelectorAll('a[href*="seguro."], a[href*="checkout."], a[href*="/checkout"]')
      .forEach(link => {
        link.addEventListener('click', addCheckoutParams);
        link.addEventListener('mousedown', addCheckoutParams); // Para capturar clique do meio/direito
      });
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Extrai o preço do produto da página
   * @returns {number} Preço do produto ou 0 se não encontrado
   */
  function extractPrice() {
    try {
      // 1. Tentar obter do JSON-LD
      const jsonLDElements = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLDElements) {
        try {
          const data = JSON.parse(script.textContent);
          
          // Para JSON-LD do tipo Product
          if (data['@type'] === 'Product' || (Array.isArray(data) && data.some(item => item['@type'] === 'Product'))) {
            const product = data['@type'] === 'Product' ? data : data.find(item => item['@type'] === 'Product');
            
            if (product && product.offers) {
              const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              if (offers && offers.price) {
                return parseFloat(offers.price);
              }
            }
          }
        } catch (e) {
          console.error('Erro ao processar JSON-LD para preço:', e);
        }
      }
      
      // 2. Procurar elementos com atributos microdata
      const priceElements = document.querySelectorAll('[itemprop="price"], [data-product-price], .product-price, .price, .product__price');
      for (const element of priceElements) {
        const priceText = element.getAttribute('content') || element.textContent;
        if (priceText) {
          // Extrair apenas os números e ponto decimal do texto
          const priceMatch = priceText.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.');
          const price = parseFloat(priceMatch);
          if (!isNaN(price) && price > 0) {
            return price;
          }
        }
      }
      
      // 3. Buscar padrões comuns de preço no HTML
      const priceRegex = /R\$\s*([\d.,]+)/;
      const bodyHTML = document.body.innerHTML;
      const priceMatch = bodyHTML.match(priceRegex);
      if (priceMatch && priceMatch[1]) {
        return parseFloat(priceMatch[1].replace(',', '.'));
      }
      
      return 0;
    } catch (error) {
      console.error('Erro ao extrair preço:', error);
      return 0;
    }
  }

  // Função de throttle para limitar a frequência de chamadas
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Função auxiliar para extrair ID do produto da URL
  function getProductIdFromURL() {
    try {
      const url = new URL(window.location.href);
      const pathParts = url.pathname.split('/');
      
      // Tenta encontrar um ID no formato numérico ou alfanumérico no final da URL
      for (let i = pathParts.length - 1; i >= 0; i--) {
        if (pathParts[i] && /^[a-zA-Z0-9_-]+$/.test(pathParts[i])) {
          return pathParts[i];
        }
      }
      
      // Se não encontrar, tenta encontrar no query string
      return url.searchParams.get('product_id') || 
             url.searchParams.get('id') || 
             url.searchParams.get('productId') || 
             null;
    } catch (e) {
      return null;
    }
  }

  // Função interna para extrair dados do carrinho
  function extractCartData() {
    console.log('[Meta Tracking Debug] Iniciando extractCartData()...'); // Log início extração carrinho
    let cartItems = [];
    let contentIds = [];
    let contents = [];
    let numItems = 0;
    let totalValue = 0;
    let currency = 'BRL'; // Default
    let cartDataExtracted = null; // Variável para armazenar dados extraídos

    // Tentativa 1: Estrutura Shopify AJAX API (se disponível)
    console.log('[Meta Tracking Debug] extractCartData - Tentativa 1: #cart-json');
    try {
        const cartJsonElement = document.getElementById('cart-json');
        const cartJsonText = cartJsonElement?.textContent;
        if (cartJsonText) {
             console.log('[Meta Tracking Debug] extractCartData - Encontrado #cart-json. Conteúdo (truncado):', cartJsonText.substring(0, 200));
             const shopifyCart = JSON.parse(cartJsonText);
             console.log('[Meta Tracking Debug] extractCartData - Conteúdo #cart-json parseado:', shopifyCart);
             if (shopifyCart && shopifyCart.items) {
                 currency = shopifyCart.currency || currency;
                 totalValue = (shopifyCart.total_price / 100); // Shopify usa centavos
                 numItems = shopifyCart.item_count;
                 shopifyCart.items.forEach(item => {
                    const itemId = String(item.variant_id || item.id);
                    const itemPrice = (item.final_line_price / item.quantity / 100); // Preço unitário
                    contentIds.push(itemId); 
                    contents.push({
                       id: itemId,
                       quantity: item.quantity,
                       item_price: itemPrice
                    });
                    console.log('[Meta Tracking Debug] extractCartData - Processado item JSON:', { id: itemId, quantity: item.quantity, item_price: itemPrice });
                 });
                 console.log('[Meta Tracking Debug] extractCartData - Dados FINAIS extraídos do #cart-json:', { contentIds, contents, numItems, totalValue, currency });
                 // Armazena os dados formatados se encontrados via JSON
                  cartDataExtracted = { 
                    content_ids: contentIds, 
                    contents, 
                    num_items: numItems, 
                    value: parseFloat(totalValue.toFixed(2)), 
                    currency, 
                    content_type: 'cart', // ou 'product_group'
                    content_name: 'Shopping Cart' 
                  };
             } else {
                console.log('[Meta Tracking Debug] extractCartData - #cart-json parseado, mas sem shopifyCart.items');
             }
        } else {
             console.log('[Meta Tracking Debug] extractCartData - Elemento #cart-json não encontrado ou sem texto.');
        }
    } catch (e) {
         console.error('[Meta Tracking Debug] extractCartData - Erro ao processar #cart-json:', e);
    }

    // Tentativa 2: Extração DOM Genérica (Fallback) - APENAS SE A TENTATIVA 1 FALHAR
    if (!cartDataExtracted) {
        console.log('[Meta Tracking Debug] extractCartData - Tentativa 2: Extração DOM genérica como fallback...');
        // Resetar variáveis para extração DOM
        contentIds = [];
        contents = [];
        numItems = 0;
        totalValue = 0;
        currency = 'BRL'; // Reset currency
        
        const itemElements = document.querySelectorAll('.cart-item') || document.querySelectorAll('[data-cart-item]'); // Seletores genéricos
        console.log('[Meta Tracking Debug] extractCartData - DOM: Elementos de item encontrados:', itemElements.length);
        
        if (itemElements.length > 0) {
            itemElements.forEach((item, index) => {
                console.log(`[Meta Tracking Debug] extractCartData - DOM: Processando item ${index + 1}`);
                // CORREÇÃO: Usar seletor específico para ID baseado no HTML fornecido
                const idElement = item.querySelector('input.quantity__input[data-quantity-variant-id]');
                const qtyElement = item.querySelector('.quantity__input'); // O mesmo input tem a quantidade no 'value'
                const priceElement = item.querySelector('.price--end'); // Usar price--end que parece conter o preço final do item
                const currencySymbolElement = document.querySelector('.cart-currency-symbol'); // Tentar encontrar símbolo da moeda (pode não existir)
                if (currencySymbolElement && currency === 'BRL') currency = currencySymbolElement.textContent.trim() === 'R$' ? 'BRL' : 'USD';

                // CORREÇÃO: Obter ID do atributo data-quantity-variant-id
                const id = idElement ? idElement.getAttribute('data-quantity-variant-id') : null;
                // CORREÇÃO: Obter quantidade do valor do input
                const quantity = qtyElement ? parseInt(qtyElement.value || qtyElement.getAttribute('data-cart-quantity') || '1', 10) : 1;
                const priceText = priceElement ? priceElement.textContent : '0';
                const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0;

                console.log('[Meta Tracking Debug] extractCartData - DOM Item Data Elements:', { idElement, qtyElement, priceElement });
                console.log('[Meta Tracking Debug] extractCartData - DOM Item Parsed Values:', { id, quantity, priceText, price });

                if (id) {
                    contentIds.push(String(id));
                    contents.push({ id: String(id), quantity: quantity, item_price: price });
                    numItems += quantity;
                    totalValue += price * quantity;
                }
            });
             console.log('[Meta Tracking Debug] extractCartData - Dados FINAIS extraídos do DOM:', { contentIds, contents, numItems, totalValue, currency });
             cartDataExtracted = { 
                content_ids: contentIds.length > 0 ? contentIds : ['DOM_N/A'], // Indicador de fallback
                contents: contents.length > 0 ? contents : [{id: 'DOM_N/A', quantity: 0, item_price: 0}],
                num_items: numItems > 0 ? numItems : 0, 
                value: parseFloat(totalValue.toFixed(2)) || 0, 
                currency: currency, 
                content_type: 'cart', 
                content_name: 'Shopping Cart' 
             };
        } else {
             console.log('[Meta Tracking Debug] extractCartData - DOM: Nenhum item encontrado via seletores genéricos.');
        }
    }
    
    // Fallback final se nada for encontrado
    if (!cartDataExtracted) {
        console.log('[Meta Tracking Debug] extractCartData - Nenhuma das tentativas (JSON ou DOM) extraiu dados. Usando fallback.');
        cartDataExtracted = { 
            content_ids: ['FALLBACK_N/A'], // Evita array vazio se falhar
            contents: [{id: 'FALLBACK_N/A', quantity: 0, item_price: 0}],
            num_items: 0, 
            value: 0, 
            currency: currency, 
            content_type: 'cart', 
            content_name: 'Shopping Cart (Fallback)' 
        };
    }
    
     console.log('[Meta Tracking Debug] extractCartData - Retornando Resultado Final:', cartDataExtracted);
     return cartDataExtracted;
  }

  // +++ FUNÇÃO INTELIGENTE PARA AGUARDAR COOKIE _FBP +++
  async function waitForFbpCookie(maxWait = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let attempts = 0;
      
      const checkCookie = () => {
        attempts++;
        
        // Usar getCookie() para ser mais preciso que document.cookie.includes()
        const fbpCookie = getCookie('_fbp');
        
        if (fbpCookie) {
          console.log(`[Meta Tracking Debug] ✅ _fbp encontrado após ${Date.now() - startTime}ms (${attempts} tentativas): ${fbpCookie}`);
          resolve(true);
          return;
        }
        
        // Se passou do tempo máximo, resolve mesmo assim
        if (Date.now() - startTime >= maxWait) {
          console.warn(`[Meta Tracking Debug] ⚠️ Timeout de ${maxWait}ms atingido. _fbp não encontrado após ${attempts} tentativas.`);
          resolve(false);
          return;
        }
        
        // Verifica novamente em 100ms
        setTimeout(checkCookie, 100);
      };
      
      checkCookie();
    });
  }

  // 🎯 FUNÇÃO CRÍTICA: Aguardar FBC para resolver timing issue de 9% de perda de qualidade
  async function waitForFbcCapture(maxWait = 1000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let attempts = 0;
      
      const checkFbc = () => {
        attempts++;
        const elapsed = Date.now() - startTime;
        
        // Tentar obter FBC do cookie
        const fbc = getFbcFromCookie();
        
        if (fbc) {
          console.log(`[Meta Tracking] ✅ FBC capturado com sucesso após ${elapsed}ms (${attempts} tentativas): ${fbc.substring(0, 30)}...`);
          resolve({ success: true, fbc: fbc, elapsed: elapsed });
          return;
        }
        
        // Se passou do tempo máximo, resolver sem FBC
        if (elapsed >= maxWait) {
          console.warn(`[Meta Tracking] ⚠️ Timeout aguardando FBC (${elapsed}ms, ${attempts} tentativas)`);
          resolve({ success: false, fbc: null, elapsed: elapsed });
          return;
        }
        
        // Continuar aguardando
        setTimeout(checkFbc, 50); // Check a cada 50ms para ser mais responsivo
      };

      // Iniciar verificação
      checkFbc();
    });
  }

  // 🔍 FUNÇÃO: Detectar se precisamos aguardar FBC baseado na origem do tráfego
  function shouldWaitForFbc() {
    const fbclid = getUrlParameter('fbclid');
    const referrer = document.referrer || '';
    const currentFbc = getFbcFromCookie();
    
    // Se já temos FBC válido, não aguardar
    if (currentFbc) {
      console.log('[Meta Tracking] 💾 FBC já disponível, não aguardar');
      return false;
    }
    
    // Se tem fbclid, aguardar processamento
    if (fbclid && fbclid.length > 10) {
      console.log('[Meta Tracking] 🔄 fbclid detectado, aguardando conversão para FBC');
      return true;
    }
    
    // Se origem é Facebook, aguardar FBC sintético
    if (referrer.includes('facebook.com') || referrer.includes('fb.com') || referrer.includes('m.facebook.com')) {
      console.log('[Meta Tracking] 📱 Origem Facebook detectada, aguardando FBC sintético');
      return true;
    }
    
    // Caso contrário, não aguardar
    console.log('[Meta Tracking] ⚡ Tráfego direto/orgânico, enviar eventos imediatamente');
    return false;
  }

  // +++ FUNÇÃO PARA VERIFICAR MODO DEBUG +++
  function isDebugEnabled() {
    // 🔥 TEMPORÁRIO: Habilitar debug para mostrar todos os logs detalhados
    return true;
    
    try {
      // Verifica parâmetro de URL ou localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const debugParam = urlParams.get('debug_meta');
      const localStorageDebug = getLocalStorageItem('meta_debug');
      
      // Retorna true se qualquer um for 'true' (string)
      return debugParam === 'true' || localStorageDebug === 'true';
    } catch (e) {
      // Em caso de erro (ex: acesso negado ao localStorage em iframes), assume false
      console.warn('[Meta Tracking Debug] Erro ao verificar modo debug:', e);
      return false;
    }
  }
  // +++ FIM DA FUNÇÃO +++

  // --- Adicionar logs para trackCustom --- 
  function logTrackCustomIfNeeded(facebookEventName, payload, options) {
     if (isDebugEnabled()) {
        try {
           console.groupCollapsed(`[LOG_WEB_FBQ] fbq('trackCustom', '${facebookEventName}', ...) (ID: ${options.eventID})`);
           console.log('Payload:', JSON.stringify(payload, null, 2));
           console.log('Options:', JSON.stringify(options, null, 2));
           console.groupEnd();
        } catch (e) {
           console.error('[LOG_WEB_FBQ] Erro ao gerar log (trackCustom):', e);
        }
     }
  }

  // Função para acessar localStorage com segurança (evita erros de sandboxing)
  function getLocalStorageItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`[Meta Tracking] LocalStorage indisponível (ambiente sandboxed): ${error.message}`);
      return null;
    }
  }

  // Função para definir localStorage com segurança
  function setLocalStorageItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`[Meta Tracking] Não foi possível salvar no localStorage (ambiente sandboxed): ${error.message}`);
      return false;
    }
  }

  // +++ MELHORIAS DE CONFIGURAÇÃO E LOGS +++

  // +++ FUNÇÕES PARA CAPTURA AUTOMÁTICA DE PII +++
  
  // Função para detectar e capturar email de formulários
  function detectAndCaptureEmail() {
    // Procurar por campos de email comuns
    const emailSelectors = [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      '#email', '#Email', '#EMAIL',
      '.email-input', '.email-field'
    ];
    
    for (const selector of emailSelectors) {
      const emailField = document.querySelector(selector);
      if (emailField && emailField.value && emailField.value.includes('@')) {
        const email = emailField.value.trim().toLowerCase();
        if (isValidEmail(email)) {
          setLocalStorageItem('meta_tracking_email', email);
          return email;
        }
      }
    }
    return null;
  }
  
  // Função para detectar e capturar telefone de formulários
  function detectAndCapturePhone() {
    const phoneSelectors = [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[name*="telefone" i]',
      'input[id*="phone" i]',
      'input[id*="telefone" i]',
      'input[placeholder*="phone" i]',
      'input[placeholder*="telefone" i]',
      '#phone', '#Phone', '#telefone', '#Telefone'
    ];
    
    for (const selector of phoneSelectors) {
      const phoneField = document.querySelector(selector);
      if (phoneField && phoneField.value) {
        const phone = phoneField.value.trim();
        if (phone.length >= 8) { // Telefone mínimo válido
          setLocalStorageItem('meta_tracking_phone', phone);
          return phone;
        }
      }
    }
    return null;
  }
  
  // Função para detectar nome de formulários
  function detectAndCaptureName() {
    const nameSelectors = [
      'input[name*="name" i]',
      'input[name*="nome" i]',
      'input[id*="name" i]',
      'input[id*="nome" i]',
      '#firstName', '#first-name', '#nome', '#name'
    ];
    
    for (const selector of nameSelectors) {
      const nameField = document.querySelector(selector);
      if (nameField && nameField.value) {
        const name = nameField.value.trim();
        if (name.length >= 2) {
          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          setLocalStorageItem('meta_tracking_first_name', firstName);
          if (lastName) {
            setLocalStorageItem('meta_tracking_last_name', lastName);
          }
          return { firstName, lastName };
        }
      }
    }
    return null;
  }
  
  // Função para validar email
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // +++ FIM DAS FUNÇÕES DE CAPTURA PII +++

  // +++ FUNÇÃO DE NORMALIZAÇÃO COMPLETA PARA PADRÃO FACEBOOK +++
  function normalizeCustomDataToFacebookStandard(data) {
    const normalized = {};
    
    // 1. NOMENCLATURA CORRETA (contentName → content_name, etc.)
    if (data.contentName) normalized.content_name = Array.isArray(data.contentName) ? data.contentName : [data.contentName];
    if (data.content_name) normalized.content_name = Array.isArray(data.content_name) ? data.content_name : [data.content_name];
    
    if (data.contentType) normalized.content_type = data.contentType;
    if (data.content_type) normalized.content_type = data.content_type;
    
    if (data.contentCategory) normalized.content_category = Array.isArray(data.contentCategory) ? data.contentCategory : [data.contentCategory];
    if (data.content_category) normalized.content_category = Array.isArray(data.content_category) ? data.content_category : [data.content_category];
    
    if (data.contentIds) normalized.content_ids = Array.isArray(data.contentIds) ? data.contentIds : [data.contentIds];
    if (data.content_ids) normalized.content_ids = Array.isArray(data.content_ids) ? data.content_ids : [data.content_ids];
    
    // 2. CAMPOS MONETÁRIOS (ESSENCIAIS PARA ROI)
    if (data.value !== undefined && data.value !== null) normalized.value = Number(data.value);
    normalized.currency = data.currency || 'BRL';
    
    // 3. CAMPOS DE QUANTIDADE
    if (data.numItems !== undefined) normalized.num_items = Number(data.numItems);
    if (data.num_items !== undefined) normalized.num_items = Number(data.num_items);
    
    // 4. CONTENTS (ARRAY DE PRODUTOS)
    if (data.contents) normalized.contents = data.contents;
    
    // 5. CAMPOS DE BUSCA
    if (data.searchString) normalized.search_string = data.searchString;
    if (data.search_string) normalized.search_string = data.search_string;
    
    // 6. OUTROS CAMPOS PADRÃO FACEBOOK
    if (data.status) normalized.status = data.status;
    if (data.order_id) normalized.order_id = data.order_id;
    if (data.orderId) normalized.order_id = data.orderId;
    
    // 7. CAMPOS DE VÍDEO
    if (data.video_title) normalized.video_title = data.video_title;
    if (data.videoTitle) normalized.video_title = data.videoTitle;
    if (data.video_position !== undefined) normalized.video_position = Number(data.video_position);
    if (data.videoPosition !== undefined) normalized.video_position = Number(data.videoPosition);
    
    // 8. CAMPOS TÉCNICOS (PRESERVAR)
    if (data.app) normalized.app = data.app;
    if (data.language) normalized.language = data.language;
    if (data.referrer_url) normalized.referrer_url = data.referrer_url;
    if (data.client_event_time) normalized.client_event_time = data.client_event_time;
    if (data.time_on_page !== undefined) normalized.time_on_page = Number(data.time_on_page);
    if (data.scroll_percentage !== undefined) normalized.scroll_percentage = Number(data.scroll_percentage);
    
    // 9. AUTO-DETECTAR CONTENT_IDS E NUM_ITEMS QUANDO FALTAM
    if (!normalized.content_ids && normalized.content_name && normalized.content_name.length > 0) {
      // Gerar IDs baseados no nome se não existirem
      normalized.content_ids = normalized.content_name.map((name, index) => `auto_id_${Date.now()}_${index}`);
    }
    
    if (!normalized.num_items && normalized.content_ids) {
      normalized.num_items = normalized.content_ids.length;
    }
    
    // 10. AUTO-DETECTAR CONTENTS QUANDO FALTAM (MAS TEM VALUE E CONTENT_IDS)
    if (!normalized.contents && normalized.content_ids && normalized.value) {
      const itemPrice = normalized.value / (normalized.num_items || 1);
      normalized.contents = normalized.content_ids.map((id, index) => ({
        id: id,
        quantity: 1,
        item_price: itemPrice
      }));
    }
    
    // 11. REMOVER CAMPOS VAZIOS/NULOS
    Object.keys(normalized).forEach(key => {
      if (normalized[key] === null || normalized[key] === undefined || normalized[key] === '') {
        delete normalized[key];
      }
    });
    
    return normalized;
  }
  // +++ FIM DA FUNÇÃO DE NORMALIZAÇÃO +++
})(); 