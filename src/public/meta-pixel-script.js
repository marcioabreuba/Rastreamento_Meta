/**
 * Meta Pixel Tracker - Similar ao TracLead mas com API própria
 * 
 * Este script detecta automaticamente o tipo de página e envia eventos equivalentes aos da TracLead
 * Incluindo Advanced Matching completo e parâmetros adicionais
 * 
 * Versão 1.4 - Suporte a Advanced Matching completo e geolocalização
 */

(function() {
  // URL da API de rastreamento
  const API_URL = 'https://rastreamento-meta.onrender.com/track';
  
  // ID do seu pixel do Facebook
  const PIXEL_ID = '1163339595278098';
  
  // Nome do cookie first-party para ID de visitante
  const VISITOR_COOKIE_NAME = '_mtVisitorId';
  const VISITOR_COOKIE_EXPIRATION_DAYS = 730; // 2 anos
  
  // Mapeamento de eventos para o Facebook - AJUSTADO PARA IGUALAR TRACKLEAD
  const EVENT_MAPPING = {
    'PageView': 'PageView',         // Igual
    'ViewHome': 'ViewHome',         // Alterado de ViewContent para ViewHome
    'ViewList': 'ViewList',         // Mantido (Tracklead usa ViewList em Categoria)
    'ViewContent': 'ViewContent',      // Igual (para páginas de produto)
    'AddToCart': 'AddToCart',        // Igual (precisa ser implementado)
    'ViewCart': 'ViewCart',         // Alterado de InitiateCheckout para ViewCart
    'StartCheckout': 'InitiateCheckout', // Mapeamento padrão mantido, mas tracklead não parece usar StartCheckout
    'CompleteRegistration': 'CompleteRegistration', // Mapeamento padrão
    'AddPaymentInfo': 'AddPaymentInfo', // Mapeamento padrão
    'Purchase': 'Purchase',         // Igual
    // Manter outros mapeamentos específicos se necessário
    'ViewCategory': 'ViewList',    // Mapear tipo interno 'ViewCategory' para 'ViewList' (Tracklead)
    'Search': 'Search',           // Mapeamento padrão
    'Refused - credit_card': 'CustomEvent',
    'Pesquisar': 'Search',
    'ViewSearchResults': 'Search',
    'Timer_1min': 'CustomEvent',
    'Scroll_25': 'CustomEvent',
    'Scroll_50': 'CustomEvent'
  };
  
  // Controle de eventos já enviados para evitar duplicação
  const sentEvents = {
    timer_1min: false,
    scroll_25: false,
    scroll_50: false,
    scroll_75: false,
    scroll_90: false,
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
    // Primeiro verificar se o ID externo existe como parâmetro na URL (para domínios cruzados)
    const urlExternalId = getUrlParameter('external_id');
    if (urlExternalId) {
      // Se encontrado na URL, salvar no localStorage
      localStorage.setItem('meta_tracking_external_id', urlExternalId);
      return urlExternalId;
    }
    
    // Caso contrário, usar o localStorage
    let externalId = localStorage.getItem('meta_tracking_external_id');
    if (!externalId) {
      externalId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('meta_tracking_external_id', externalId);
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

    // --- ETAPA 3: Preparar dados e ENFILEIRAR chamadas init/track --- 

    const pageViewEventId = generateUUID();
    const externalId = getExternalId();
    const fbp = validateFbp(getCookie('_fbp') || getUrlParameter('fbp'));
    const fbc = getCookie('_fbc') || getUrlParameter('fbclid') || null;

    // Coletar PII (sem hash)
    const email = localStorage.getItem('meta_tracking_email');
    const phone = localStorage.getItem('meta_tracking_phone');
    const firstName = localStorage.getItem('meta_tracking_first_name');
    const lastName = localStorage.getItem('meta_tracking_last_name');
    const gender = localStorage.getItem('meta_tracking_gender');
    const dob = localStorage.getItem('meta_tracking_dob');
    const city = localStorage.getItem('meta_tracking_city');
    const state = localStorage.getItem('meta_tracking_state');
    const zip = localStorage.getItem('meta_tracking_zip');
    const country = localStorage.getItem('meta_tracking_country');
    console.log('[Meta Tracking Debug] Dados PII coletados (localStorage):', { email, phone, firstName, lastName, gender, dob, city, state, zip, country });

    // Montar parâmetros para init (sem hash)
    const pixelParams = {
      external_id: externalId, fbp: fbp, fbc: fbc,
      client_user_agent: navigator.userAgent,
      em: email, ph: phone, fn: firstName, ln: lastName,
      ge: gender, db: dob, ct: city, st: state, zp: zip, country: country
    };
    Object.keys(pixelParams).forEach(key => pixelParams[key] == null && delete pixelParams[key]);
    console.log('[Meta Tracking Debug] Parâmetros para fbq(\'init\'):', pixelParams); // Log dos parâmetros do init (ASPAS ESCAPADAS)

    // ENFILEIRAR init (dispara PageView automático SEM eventID visível no helper)
    fbq('init', PIXEL_ID, pixelParams);
    console.log(`[Meta Tracking Debug] fbq('init') enfileirado.`); // Mudança de [Meta Tracking] para [Meta Tracking Debug]

    // Montar parâmetros customizados para PageView explícito
    const pageTitle = document.title || 'Page View'; // Captura o título aqui
    const customParams = {
      app: 'meta-tracking',
      contentName: pageTitle, // Usa o título capturado
      contentType: 'page_view',
      language: navigator.language || 'pt-BR',
      referrer: document.referrer || ''
    };
    Object.keys(customParams).forEach(key => customParams[key] == null && delete customParams[key]);
    console.log('[Meta Tracking Debug] Parâmetros Customizados para PageView explícito:', customParams); // Log dos parâmetros do PageView

    // ENFILEIRAR PageView explícito COM eventID
    const fbqOptions = { eventID: pageViewEventId };
    fbq('track', 'PageView', customParams, fbqOptions);
    console.log(`[Meta Tracking Debug] fbq('track', 'PageView') enfileirado (ID: ${pageViewEventId})`); // Mudança de [Meta Tracking] para [Meta Tracking Debug]

    // --- ETAPA 4: Enviar para Backend (pode ser chamado fora da fila, mas após enfileirar fbq) ---
    const allRawUserDataForInit = {
        external_id: externalId, visitorId: getOrCreateVisitorId(),
        fbp: fbp, fbc: fbc, em: email, ph: phone, fn: firstName, ln: lastName,
        ge: gender, db: dob, ct: city, st: state, zp: zip, country: country
    };
    // Pequeno delay pode ajudar a garantir que IDs como fbp foram setados pelo init
    setTimeout(function() {
         // LOG: Dados enviados para backend no PageView
         console.log('[Meta Tracking Debug] Enviando PageView para Backend:', { eventName: 'PageView', rawUserData: allRawUserDataForInit, specificCustomData: customParams, eventId: pageViewEventId });
         sendEventToBackend('PageView', allRawUserDataForInit, customParams, pageViewEventId);
    }, 150); 

  }

  // Funções para encontrar elementos específicos na página
  function getProductDetails() {
    // Tenta detectar informações de produtos - esta é uma implementação genérica
    // Para um site específico, você pode ajustar os seletores ou lógica
    console.log('[Meta Tracking Debug] Tentando getProductDetails()...'); // Log início da função

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
                 }
                  if (!shopifyCurrency && productData.offers) {
                    const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
                    if (offer && offer.priceCurrency) {
                       shopifyCurrency = offer.priceCurrency;
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

    // Moeda Final (Prioridade: Shopify/JSON-LD > DOM)
    const finalCurrency = shopifyCurrency || currency;
    console.log('[Meta Tracking Debug] getProductDetails - finalCurrency Definida:', finalCurrency);

    // LOG: Verificar objetos globais comuns do Shopify
    console.log('[Meta Tracking Debug] Verificando Globals Shopify:', { 
      ShopifyAnalytics: typeof ShopifyAnalytics !== 'undefined' ? ShopifyAnalytics : 'undefined',
      meta: typeof meta !== 'undefined' ? meta : 'undefined' 
    });

    const details = { 
        contentIds: finalProductId ? [finalProductId] : [], 
        contentName: productName || document.title, 
        contentType: 'product',
        value: finalPrice, // Usa preço final
        contentCategory: finalCategory ? finalCategory : '', // Usa categoria final
        currency: finalCurrency // Usa moeda final
    };
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
      return { type: 'ViewHome', data: { contentName: 'Home Page', contentType: 'home_page' } };
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
           contentName: categoryName, 
           contentType: 'product_group', 
           contentCategory: categoryName 
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
    return { type: 'PageView', data: { contentName: document.title || 'Page View', contentType: 'page_view' } }; // Fallback
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
    // Se não existir ou for inválido, GERAR um novo FBP válido
    if (!fbp || !/^fb\.[12]\.\d+\.\d+$/.test(fbp)) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000000);
      const newFbp = `fb.1.${timestamp}.${random}`;
      
      // Definir o cookie _fbp para uso futuro (90 dias)
      // Verificar se a função setCookie está disponível antes de chamá-la
      if (typeof setCookie === 'function') {
        setCookie('_fbp', newFbp, 90); 
      } else {
        console.warn('Função setCookie não encontrada. Não foi possível salvar o _fbp gerado.');
      }
      
      return newFbp; // Retorna o FBP recém-gerado
    }
    
    // Verificar se já está no formato correto fb.1...
    if (/^fb\.1\.\d+\.\d+$/.test(fbp)) {
      return fbp;
    }
    
    // Se começar com fb.2, corrigir para fb.1
    if (fbp.startsWith('fb.2.')) {
      return 'fb.1.' + fbp.substring(5);
    }
    
    // Como a lógica inicial agora gera um FBP se for inválido,
    // este fallback teoricamente não será mais alcançado, mas mantemos por segurança.
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `fb.1.${timestamp}.${random}`;
  }

  // >>> INÍCIO DA SEÇÃO MODIFICADA <<<

  // Função auxiliar para enviar dados brutos para o backend /track
  async function sendEventToBackend(eventName, rawUserData = {}, specificCustomData = {}, eventId) {
    console.log(`[Frontend Script] Preparando envio para backend: ${eventName} (ID: ${eventId})`);
    // const eventId = generateUUID(); // <<< REMOVER geração aqui, já vem como parâmetro

    // Combinar dados de usuário gerais com PII (se houver)
    const finalUserData = {
        ...rawUserData, // Contém external_id, fbp, fbc, visitorId, PII, etc.
    };

    const payload = {
        eventName: eventName,
        eventId: eventId, // <<< Usar o eventId recebido
        sourceUrl: window.location.href,
        referrer: document.referrer || '',
        userData: finalUserData,
        customData: {
            ...specificCustomData,
            language: navigator.language || 'pt-BR',
            app: 'meta-tracking'
        }
    };

    // Remover chaves nulas/undefined do payload para limpeza
    Object.keys(payload.userData).forEach(key => payload.userData[key] == null && delete payload.userData[key]);
    Object.keys(payload.customData).forEach(key => payload.customData[key] == null && delete payload.customData[key]);

    // Enviar para /track
    try {
        console.log('[Frontend Script] Enviando payload bruto para /track:', JSON.stringify(payload).substring(0, 500) + '...'); // Log truncado
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true // Importante para enviar em unload/pagehide
        });
        if (!response.ok) {
            console.error(`[Frontend Script] Erro ao enviar evento ${eventName} para backend: ${response.status} ${response.statusText}`);
        }
        // const responseData = await response.json(); // Opcional
        // console.log('Resposta do backend:', responseData);
    } catch (error) {
        console.error(`[Frontend Script] Falha na requisição fetch para ${eventName}:`, error);
    }
  }

  // Função principal para disparar eventos (simplificada)
  async function sendEvent(eventName, customData = {}) {
    // Mapear o nome do evento interno para o evento do Facebook, se necessário
    const facebookEventName = EVENT_MAPPING[eventName] || eventName; // Usa mapeamento ou nome original
    const eventId = generateUUID();

    // Coletar dados comuns
    const externalId = getExternalId();
    const visitorId = getOrCreateVisitorId();
    const fbp = validateFbp(getCookie('_fbp') || getUrlParameter('fbp'));
    const fbc = getCookie('_fbc') || getUrlParameter('fbclid') || null;
    
    // Coletar PII novamente (pode ter sido atualizado desde o init)
    const email = localStorage.getItem('meta_tracking_email');
    const phone = localStorage.getItem('meta_tracking_phone');
    const firstName = localStorage.getItem('meta_tracking_first_name');
    // ... (outros PII) ...
    const city = localStorage.getItem('meta_tracking_city');
    const state = localStorage.getItem('meta_tracking_state');
    const zip = localStorage.getItem('meta_tracking_zip');
    const country = localStorage.getItem('meta_tracking_country');


    // Montar UserData para backend e Advanced Matching para fbq
    const rawUserData = {
      external_id: externalId, visitorId: visitorId, fbp: fbp, fbc: fbc,
      em: email, ph: phone, fn: firstName, /* ... outros ... */ city, state, zip, country
    };
    Object.keys(rawUserData).forEach(key => rawUserData[key] == null && delete rawUserData[key]);

    // Montar Advanced Matching Params para fbq (sem hash)
    const advancedMatchingParams = { ...rawUserData }; // Reutiliza os dados já coletados
    // Adicionar userAgent que fbq usa
    advancedMatchingParams.client_user_agent = navigator.userAgent; 
    Object.keys(advancedMatchingParams).forEach(key => advancedMatchingParams[key] == null && delete advancedMatchingParams[key]);


    // Mesclar dados customizados específicos do evento
    const finalCustomData = {
      app: 'meta-tracking',
      language: navigator.language || 'pt-BR',
      referrer: document.referrer || '',
      ...customData // Dados específicos vindos de detectPageType, etc.
    };
    // Garantir que dados essenciais como value/currency não sejam sobrescritos por null/undefined
     Object.keys(finalCustomData).forEach(key => {
        if (finalCustomData[key] == null) {
            // Se o customData específico tinha um valor, não apague
            if (customData.hasOwnProperty(key) && customData[key] != null) {
                 // não faz nada, mantém o valor do customData
            } else {
                 delete finalCustomData[key]; // Remove null/undefined gerais
            }
        }
     });
     // Remover campos que já estão no advancedMatchingParams para evitar redundância no fbq('track')
     // delete finalCustomData.external_id; // fbq já recebe no init/AM
     // delete finalCustomData.fbp;
     // delete finalCustomData.fbc;


    // LOG: Dados finais antes de enviar para FBQ e Backend
    console.log(`[Meta Tracking Debug] Preparando evento: ${eventName} (Mapeado para: ${facebookEventName})`);
    console.log('[Meta Tracking Debug]   Advanced Matching (para fbq):', advancedMatchingParams);
    console.log('[Meta Tracking Debug]   Custom Data (para fbq e backend):', finalCustomData);
    console.log('[Meta Tracking Debug]   Raw User Data (para backend):', rawUserData);
    console.log('[Meta Tracking Debug]   Event ID:', eventId);


    // Enviar para o Facebook Pixel
    try {
      if (window.fbq) {
        const fbqOptions = { eventID: eventId };
        
        // CORREÇÃO: Usar trackCustom para eventos não padrão como ViewCart ou mapeados para CustomEvent
        if (['ViewCart', 'ViewHome', 'ViewList'].includes(facebookEventName) || EVENT_MAPPING[eventName] === 'CustomEvent') { 
          // Adicionar nome do evento customizado como parâmetro, se for CustomEvent genérico
          const customEventPayload = { ...finalCustomData };
          if (EVENT_MAPPING[eventName] === 'CustomEvent') {
             customEventPayload.event = eventName; // Adiciona o nome original (ex: Timer_1min) 
             console.log('[Meta Tracking Debug] Enviando como trackCustom (CustomEvent): ', facebookEventName, customEventPayload, fbqOptions);
             fbq('trackCustom', eventName, customEventPayload, fbqOptions); // Usa eventName original aqui
          } else {
             console.log('[Meta Tracking Debug] Enviando como trackCustom (Não Padrão): ', facebookEventName, finalCustomData, fbqOptions);
             fbq('trackCustom', facebookEventName, finalCustomData, fbqOptions);
          }
        } else {
          // Para eventos padrão (PageView, ViewContent, AddToCart, Purchase, etc.) usar track padrão
          console.log('[Meta Tracking Debug] Enviando como track (Padrão): ', facebookEventName, finalCustomData, fbqOptions);
          fbq('track', facebookEventName, finalCustomData, fbqOptions);
        }
        // console.log(`[Meta Tracking Debug] fbq('track...') enfileirado (ID: ${eventId})`); // Log genérico removido, logs específicos acima
      } else {
        console.warn('[Meta Tracking Debug] fbq não está definido ao tentar enviar evento:', facebookEventName);
      }
    } catch (error) {
      console.error('[Meta Tracking Debug] Erro ao enviar evento para FB Pixel:', error);
    }

    // Enviar para o Backend
    // Pequeno delay pode ajudar se houver concorrência
     setTimeout(function() {
         console.log('[Meta Tracking Debug] Enviando evento para Backend:', { eventName: eventName, rawUserData, specificCustomData: finalCustomData, eventId });
         sendEventToBackend(eventName, rawUserData, finalCustomData, eventId);
    }, 50); 
  }
  // >>> FIM DA SEÇÃO MODIFICADA <<<

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
            scrollPercentage: 25,
            pageUrl: window.location.href,
            contentName: document.title
          });
        }
        
        if (scrollPercentage >= 50 && !sentEvents.scroll_50) {
          sentEvents.scroll_50 = true;
          sendEvent('Scroll_50', {
            scrollPercentage: 50,
            pageUrl: window.location.href,
            contentName: document.title
          });
        }
        
        // Adicionar rastreamento de rolagem para 75%
        if (scrollPercentage >= 75 && !sentEvents.scroll_75) {
          sentEvents.scroll_75 = true;
          sendEvent('Scroll_75', {
            scrollPercentage: 75,
            pageUrl: window.location.href,
            contentName: document.title
          });
        }
        
        // Adicionar rastreamento de rolagem para 90%
        if (scrollPercentage >= 90 && !sentEvents.scroll_90) {
          sentEvents.scroll_90 = true;
          sendEvent('Scroll_90', {
            scrollPercentage: 90,
            pageUrl: window.location.href,
            contentName: document.title
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
        sendEvent('Timer_1min', { time_on_page: 60 });
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
          contentIds: [videoId],
          contentName: video.getAttribute('title') || video.getAttribute('data-title') || videoId,
          contentType: 'video'
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
            videoData.videoDuration = video.duration;
            
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
              videoPosition: 25,
              videoDuration: video.duration,
              videoTitle: videoData.contentName
            });
          }
          
          if (percentage >= 50 && !trackedProgressPoints['50']) {
            trackedProgressPoints['50'] = true;
            sendEvent('ViewVideo_50', {
              ...videoData,
              videoPosition: 50,
              videoDuration: video.duration,
              videoTitle: videoData.contentName
            });
          }
          
          if (percentage >= 75 && !trackedProgressPoints['75']) {
            trackedProgressPoints['75'] = true;
            sendEvent('ViewVideo_75', {
              ...videoData,
              videoPosition: 75,
              videoDuration: video.duration,
              videoTitle: videoData.contentName
            });
          }
          
          if (percentage >= 90 && !trackedProgressPoints['90']) {
            trackedProgressPoints['90'] = true;
            sendEvent('ViewVideo_90', {
              ...videoData,
              videoPosition: 90,
              videoDuration: video.duration,
              videoTitle: videoData.contentName
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
              contentName: form.getAttribute('name') || form.id || 'form_lead',
              contentCategory: 'lead',
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
            contentIds: productId ? [productId] : null,
            contentName: productName || 'Product',
            contentCategory: 'wishlist'
          });
        });
      });
    });
  }

  // Adiciona listener para o evento AddToCart
  function setupAddToCartListener() {
    console.log('[Meta Tracking Debug] Configurando listener AddToCart...');
    // Seletor específico baseado no HTML fornecido
    const specificSelector = 'button[name="add"]';
    const formSelector = 'form[action*="/cart/add"] button[name="add"]'; // Alternativa mais específica

    let button = document.querySelector(specificSelector);
    let usedSelector = specificSelector;

    if (!button) {
        console.log('[Meta Tracking Debug] Seletor AddToCart (button[name="add"]) não encontrado, tentando seletor de formulário...');
        button = document.querySelector(formSelector);
        usedSelector = formSelector;
    }

    if (button) {
      console.log('[Meta Tracking Debug] Botão AddToCart encontrado com seletor:', usedSelector, button);
      button.addEventListener('click', (event) => {
        // Pode ser necessário um pequeno delay ou verificar se o clique foi bem-sucedido
        // antes de disparar o evento, mas por enquanto vamos disparar imediatamente.
        console.log('[Meta Tracking Debug] Evento de clique AddToCart disparado!');
        // Obter os dados do produto ATUAL da página
        const productData = getProductDetails(); 
        // Remover dados que não são padrão do AddToCart se necessário (como contentCategory)
        // delete productData.contentCategory; 
        console.log('[Meta Tracking Debug] Dados do produto para AddToCart:', productData);
        sendEvent('AddToCart', productData);
      });
    } else {
      console.warn('[Meta Tracking Debug] Nenhum botão AddToCart encontrado com os seletores específicos (button[name="add"] ou via formulário).');
    }
  }

  // Função principal - detecta a página e envia os eventos
  function init() {
    // Carrega script fbevents.js e inicializa o pixel (o PageView já foi disparado na função initFacebookPixel)
    initFacebookPixel();
    
    // Detecta o tipo de página
    const pageInfo = detectPageType();
    if (pageInfo && pageInfo.type !== 'PageView') {
      // Adiciona um atraso antes de enviar o evento inicial, mas apenas se não for PageView
      // pois o PageView já foi enviado na inicialização do pixel
      console.log(`Atrasando envio do evento inicial "${pageInfo.type}" por 750ms para permitir a inicialização de cookies.`);
      setTimeout(() => {
        console.log(`Enviando evento inicial "${pageInfo.type}" após atraso.`);
        sendEvent(pageInfo.type, pageInfo.data);
      }, 750); // Atraso de 750 milissegundos
    } else if (!pageInfo || pageInfo.type === 'PageView') {
      // Se nenhum tipo específico for detectado ou for PageView, não enviamos PageView novamente
      console.log('Nenhum tipo de página específico detectado ou é PageView. PageView já foi enviado na inicialização.');
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
          contentName: 'Bolsa de palha trama',
          contentType: 'product_group',
          contentCategory: ['bolsa'],
          contentIds: ['9068696764659'],
          contents: [{ id: '9068696764659', quantity: 1 }],
          numItems: 1, 
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
                    contentIds, 
                    contents, 
                    numItems, 
                    value: parseFloat(totalValue.toFixed(2)), 
                    currency, 
                    contentType: 'cart', // ou 'product_group'
                    contentName: 'Shopping Cart' 
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
                contentIds: contentIds.length > 0 ? contentIds : ['DOM_N/A'], // Indicador de fallback
                contents: contents.length > 0 ? contents : [{id: 'DOM_N/A', quantity: 0, item_price: 0}],
                numItems: numItems > 0 ? numItems : 0, 
                value: parseFloat(totalValue.toFixed(2)) || 0, 
                currency: currency, 
                contentType: 'cart', 
                contentName: 'Shopping Cart' 
             };
        } else {
             console.log('[Meta Tracking Debug] extractCartData - DOM: Nenhum item encontrado via seletores genéricos.');
        }
    }
    
    // Fallback final se nada for encontrado
    if (!cartDataExtracted) {
        console.log('[Meta Tracking Debug] extractCartData - Nenhuma das tentativas (JSON ou DOM) extraiu dados. Usando fallback.');
        cartDataExtracted = { 
            contentIds: ['FALLBACK_N/A'], // Evita array vazio se falhar
            contents: [{id: 'FALLBACK_N/A', quantity: 0, item_price: 0}],
            numItems: 0, 
            value: 0, 
            currency: currency, 
            contentType: 'cart', 
            contentName: 'Shopping Cart (Fallback)' 
        };
    }
    
     console.log('[Meta Tracking Debug] extractCartData - Retornando Resultado Final:', cartDataExtracted);
     return cartDataExtracted;
  }
})(); 