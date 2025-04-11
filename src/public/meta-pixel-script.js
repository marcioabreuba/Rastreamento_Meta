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
  
  // Mapeamento de eventos para o Facebook
  const EVENT_MAPPING = {
    'PageView': 'PageView',
    'ViewHome': 'ViewHome',
    'ViewList': 'ViewContent',
    'ViewContent': 'ViewContent',
    'AddToCart': 'AddToCart',
    'ViewCart': 'ViewContent',
    'StartCheckout': 'InitiateCheckout',
    'RegisterDone': 'CompleteRegistration',
    'ShippingLoaded': 'AddPaymentInfo',
    'AddPaymentInfo': 'AddPaymentInfo',
    'Purchase': 'Purchase',
    'Purchase - credit_card': 'Purchase',
    'Purchase - pix': 'Purchase',
    'Purchase - billet': 'Purchase',
    'Purchase - paid_pix': 'Purchase',
    'Purchase - high_ticket': 'Purchase',
    'ViewCategory': 'ViewContent',
    'AddCoupon': 'AddToCart',
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

  // Função para obter cookies
  function getCookie(name) {
    // Primeiro verificar se o cookie existe como parâmetro na URL (para domínios cruzados)
    const urlValue = getUrlParameter(name);
    if (urlValue) return urlValue;
    
    // Caso contrário, buscar no cookie
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
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

  // Inicializar o Facebook Pixel
  function initFacebookPixel() {
    // Inicializar o pixel do Facebook
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    // Obter todos os parâmetros obrigatórios de Advanced Matching
    const externalId = getExternalId();
    // Obter cookies do Facebook
    const fbp_cookie = getCookie('_fbp') || getUrlParameter('fbp');
    const fbp = validateFbp(fbp_cookie);
    const fbc = getCookie('_fbc') || getUrlParameter('fbc') || getUrlParameter('fbclid') || null;
    
    // Dados geográficos salvos (se disponíveis)
    let geoData = {};
    const savedUserData = localStorage.getItem('meta_tracking_user_data');
    if (savedUserData) {
      try {
        const parsed = JSON.parse(savedUserData);
        geoData = {
          country: parsed.country,
          state: parsed.state,
          city: parsed.city,
          zip: parsed.zip
        };
      } catch (e) {
        console.error('Erro ao ler dados de geolocalização salvos:', e);
      }
    }

    // Configuração do pixel com Advanced Matching completo
    const pixelParams = {
      external_id: externalId,
      // FBP e FBC não devem ser hasheados conforme Guia.MD
      fbp: fbp,
      fbc: fbc,
      // Adicionar client_user_agent para padronizar com ViewHome
      client_user_agent: navigator.userAgent
    };
    
    // Adicionar dados geográficos se disponíveis
    // Nota: estes serão enviados como texto puro, a API do Meta fará o hash corretamente
    if (geoData.country) pixelParams.country = geoData.country;
    if (geoData.state) pixelParams.st = geoData.state;
    if (geoData.city) pixelParams.ct = geoData.city;
    if (geoData.zip) pixelParams.zp = geoData.zip;
    
    // Verificar se temos dados pessoais salvos (email, telefone, nome, etc.)
    const email = localStorage.getItem('meta_tracking_email');
    const phone = localStorage.getItem('meta_tracking_phone');
    const firstName = localStorage.getItem('meta_tracking_first_name');
    const lastName = localStorage.getItem('meta_tracking_last_name');
    const gender = localStorage.getItem('meta_tracking_gender');
    const dob = localStorage.getItem('meta_tracking_dob');
    
    // Adicionar dados pessoais se disponíveis (sem hashear, o Meta fará isso)
    if (email) pixelParams.em = email;
    if (phone) pixelParams.ph = phone;
    if (firstName) pixelParams.fn = firstName;
    if (lastName) pixelParams.ln = lastName;
    if (gender) pixelParams.ge = gender;
    if (dob) pixelParams.db = dob;
    
    // Inicializar com Advanced Matching completo e disparar PageView imediatamente
    fbq('init', PIXEL_ID, pixelParams);
    
    // Adicionar parâmetros customizados ao PageView para padronizar com ViewHome
    const customParams = {
      app: 'meta-tracking',
      contentName: document.title || 'Page View',
      contentType: 'page_view',
      language: navigator.language || 'pt-BR',
      referrer: document.referrer || ''
    };
    
    // Enviar PageView com parâmetros customizados
    fbq('track', 'PageView', customParams);
    
    console.log('Facebook Pixel inicializado para ID:', PIXEL_ID, 'com Advanced Matching completo e PageView disparado', pixelParams);
    
    // Enviar o mesmo evento para o backend para processamento via API
    setTimeout(function() {
      // Preparar payload com todos os dados disponíveis (mesmo Advanced Matching do pixel)
      const payload = {
        eventName: 'PageView',
        eventId: generateUUID(),
        eventSource: 'web',
        url: window.location.href,
        // Incluir todos os parâmetros de Advanced Matching
        fbp: fbp,
        fbc: fbc,
        // Incluir dados pessoais se disponíveis
        em: email || '',
        ph: phone || '',
        fn: firstName || '',
        ln: lastName || '',
        ge: gender || '',
        db: dob || '',
        // Incluir dados de geolocalização se disponíveis
        country: geoData.country || '',
        state: geoData.state || '',
        city: geoData.city || '',
        zip: geoData.zip || '',
        // Usar EXATAMENTE os mesmos parâmetros customizados do evento web
        // para garantir sincronização perfeita
        customData: {
          ...customParams,
          // Garantir que o título da página seja idêntico
          contentName: document.title || 'Page View',
          // Garantir que o idioma seja idêntico
          language: navigator.language || 'pt-BR',
          // Adicionar currency e value para padronizar com outros eventos
          currency: 'BRL',
          value: 0
        }
      };

      // Enviar para o backend
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (response.ok) {
          console.log('✅ Evento PageView enviado com sucesso para o backend');
        } else {
          console.error('❌ Erro ao enviar evento PageView para o backend:', response.status);
        }
      })
      .catch(error => {
        console.error('❌ Erro ao enviar evento PageView para o backend:', error);
      });
    }, 100); // Pequeno delay para garantir que o pixel foi inicializado
  }

  // Funções para encontrar elementos específicos na página
  function getProductDetails() {
    // Tenta detectar informações de produtos - esta é uma implementação genérica
    // Para um site específico, você pode ajustar os seletores ou lógica

    // Nome do produto (título)
    let productName = '';
    const titleElement = document.querySelector('h1') || document.querySelector('.product-title');
    if (titleElement) {
      productName = titleElement.textContent.trim();
    }

    // Preço
    let price = 0;
    const priceElement = document.querySelector('.price') || document.querySelector('[data-product-price]');
    if (priceElement) {
      const priceText = priceElement.textContent.trim().replace(/[^0-9,.]/g, '');
      price = parseFloat(priceText.replace(',', '.'));
    }

    return {
      contentName: productName,
      contentType: 'product',
      value: price,
      currency: 'BRL' // Pode ser detectado dinamicamente para sites multi-moeda
    };
  }

  // Detecta o tipo de página
  function detectPageType() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    const search = window.location.search;
    
    // Detecção de resultados de pesquisa
    if (search.includes('q=') || search.includes('query=') || search.includes('search=')) {
      const searchQuery = new URLSearchParams(window.location.search).get('q') || 
                         new URLSearchParams(window.location.search).get('query') || 
                         new URLSearchParams(window.location.search).get('search') || '';
      
      if (searchQuery) {
        return {
          type: 'search_results',
          eventName: 'ViewSearchResults',
          data: {
            searchString: searchQuery,
            contentType: 'search_results',
            contentName: `Resultados para "${searchQuery}"`
          }
        };
      }
    }
    
    // Detecção específica para domínio de checkout
    if (hostname.includes('seguro.') || hostname.includes('checkout.')) {
      // Checkout específico do site seguro.soleterra.com.br
      if (path.includes('/checkout') || path === '/' || path === '') {
        return {
          type: 'checkout',
          eventName: 'StartCheckout',
          data: {
            contentName: 'Checkout',
            contentType: 'checkout'
          }
        };
      }
      
      // Página de pagamento
      if (path.includes('/payment') || path.includes('/pagamento')) {
        return {
          type: 'payment',
          eventName: 'AddPaymentInfo',
          data: {
            contentName: 'Payment Information',
            contentType: 'payment'
          }
        };
      }
      
      // Página de confirmação/sucesso
      if (path.includes('/success') || path.includes('/sucesso') || path.includes('/confirmacao')) {
        return {
          type: 'purchase',
          eventName: 'Purchase',
          data: {
            contentName: 'Purchase Confirmation',
            contentType: 'purchase',
            // Tentar obter ID do pedido da URL
            orderId: getUrlParameter('order_id') || getUrlParameter('pedido')
          }
        };
      }
    }
    
    // Continue com as detecções padrão
    if (path === '/' || path === '/home' || path === '/index.html' || path.includes('index')) {
      return {
        type: 'home',
        eventName: 'ViewHome',
        data: {
          contentName: 'Home Page',
          contentType: 'home_page'
        }
      };
    }
    
    if (path.includes('/product') || path.includes('/produto')) {
      // Extrair informações do produto
      let productId = null;
      let productTitle = '';
      let productCategories = [];
      
      // 1. Tentar extrair ID do produto da URL
      // URLs típicas: /products/product-name-123456789
      const pathParts = path.split('/');
      const lastSegment = pathParts[pathParts.length - 1];
      const idMatch = lastSegment.match(/\d+$/);
      if (idMatch) {
        productId = idMatch[0];
      }
      
      // 2. Tentar obter o ID do produto via metatags ou JSON-LD
      const jsonLDElements = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLDElements.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          
          // Para JSON-LD do tipo Product
          if (data['@type'] === 'Product' || (Array.isArray(data) && data.some(item => item['@type'] === 'Product'))) {
            const product = data['@type'] === 'Product' ? data : data.find(item => item['@type'] === 'Product');
            
            if (product) {
              // Obter ID do produto
              if (product.productID) {
                productId = product.productID;
              } else if (product.sku) {
                productId = product.sku;
              } else if (product.offers && product.offers.sku) {
                productId = product.offers.sku;
              } else if (product.offers && Array.isArray(product.offers) && product.offers[0] && product.offers[0].sku) {
                productId = product.offers[0].sku;
              } else if (product.mpn) {
                productId = product.mpn;
              } else if (product.gtin13) {
                productId = product.gtin13;
              } else if (product.gtin14) {
                productId = product.gtin14;
              } else if (product.gtin8) {
                productId = product.gtin8;
              } else if (product.gtin) {
                productId = product.gtin;
              }
              
              // Obter título do produto
              if (product.name) {
                productTitle = product.name;
              }
              
              // Obter categorias do produto
              if (product.category) {
                if (typeof product.category === 'string') {
                  productCategories = product.category.split('/').filter(c => c.trim() !== '');
                } else if (Array.isArray(product.category)) {
                  productCategories = product.category;
                }
              }
            }
          }
        } catch (e) {
          console.error('Erro ao processar JSON-LD:', e);
        }
      });
      
      // 3. Tentar obter ID e categoria de elementos DOM comuns
      if (!productId) {
        // Tentar extrair do URL para Shopify (formato típico: /products/nome-do-produto?variant=123456789)
        const variantParam = new URLSearchParams(window.location.search).get('variant');
        if (variantParam) {
          productId = variantParam;
        }
        
        // Procurar por input hidden ou data attributes com ID do produto
        const idElement = document.querySelector('input[name="product_id"], [data-product-id], [id*="ProductJson-"], [data-section-id], [data-variant-id], form[action*="/cart/add"] [name="id"]');
        if (idElement) {
          productId = idElement.value || idElement.getAttribute('data-product-id') || idElement.getAttribute('data-variant-id') || idElement.getAttribute('data-section-id');
        }
        
        // Procurar em meta tags específicas
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
          const property = tag.getAttribute('property') || tag.getAttribute('name');
          if (property === 'product:id' || property === 'product:retailer_item_id' || property === 'og:product:id') {
            productId = tag.getAttribute('content');
          }
        });
        
        // Tentar encontrar scripts Shopify com dados do produto
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          if (content.includes('var meta') && content.includes('product')) {
            try {
              // Extrair ID do produto de scripts Shopify
              const idMatch = content.match(/\"id\":(\d+)/);
              if (idMatch && idMatch[1]) {
                productId = idMatch[1];
                break;
              }
            } catch (e) { /* Ignorar erros */ }
          }
          
          if (content.includes('product_') && content.includes('variant_')) {
            try {
              // Extrair ID do produto de scripts de produtos
              const idMatch = content.match(/product_(\d+)/);
              if (idMatch && idMatch[1]) {
                productId = idMatch[1];
                break;
              }
            } catch (e) { /* Ignorar erros */ }
          }
        }
      }
      
      // 4. Tentar obter título do produto do H1 ou título da página
      if (!productTitle) {
        const h1 = document.querySelector('h1');
        if (h1) {
          productTitle = h1.textContent.trim();
        } else if (document.title) {
          productTitle = document.title.split('|')[0].trim();
        }
      }
      
      // 5. Tentar obter categorias do breadcrumb
      if (productCategories.length === 0) {
        const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a, .breadcrumb-item a, nav[aria-label="breadcrumb"] a');
        if (breadcrumbs.length > 0) {
          // Geralmente o último item é o produto atual, então pegamos os anteriores
          for (let i = 0; i < breadcrumbs.length - 1; i++) {
            const category = breadcrumbs[i].textContent.trim();
            if (category && !['Home', 'Início', 'Principal'].includes(category)) {
              productCategories.push(category.toLowerCase());
            }
          }
        }
      }
      
      // 6. Tentar obter categoria a partir do último caminho da URL referenciadora
      if (productCategories.length === 0 && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          const referrerPath = referrerUrl.pathname;
          if (referrerPath.includes('/collection') || referrerPath.includes('/categoria') || referrerPath.includes('/collections')) {
            const referrerParts = referrerPath.split('/');
            const lastReferrerSegment = referrerParts[referrerParts.length - 1];
            if (lastReferrerSegment && !['collection', 'collections', 'categoria'].includes(lastReferrerSegment)) {
              const categoryName = lastReferrerSegment
                .replace(/-/g, ' ')
                .replace(/_/g, ' ')
                .toLowerCase();
              productCategories.push(categoryName);
            }
          }
        } catch (e) {
          console.error('Erro ao processar URL de referência:', e);
        }
      }
      
      // 7. Solução específica para site Soleterra
      if (hostname.includes('soleterra.com.br')) {
        // Coleções conhecidas da Soleterra
        const knownCollections = ['palha', 'croche', 'crochê', 'couro', 'festa', 'bolsa'];
        
        // Verificar se o produto está em uma categoria conhecida
        if (productTitle) {
          const productTitleLower = productTitle.toLowerCase();
          for (const collection of knownCollections) {
            if (productTitleLower.includes(collection)) {
              // Adicionar a categoria, mas apenas se ainda não existir
              if (!productCategories.includes(collection)) {
                productCategories.push(collection);
              }
              break;
            }
          }
        }
        
        // Tentar extrair o ID do produto usando a convenção da Soleterra
        if (!productId && lastSegment) {
          // Verificar se há algum número no final do último segmento
          const matches = lastSegment.match(/\d+/g);
          if (matches && matches.length > 0) {
            productId = matches[matches.length - 1];
          }
        }
        
        // Verificações específicas para o site Soleterra
        if (!productId) {
          // Método 1: Procurar botões de adição ao carrinho que contêm IDs de produtos
          const addToCartButtons = document.querySelectorAll('button[name="add"], [data-product-id], .add-to-cart, [data-button-action="add-to-cart"]');
          for (const button of addToCartButtons) {
            const btnProductId = button.getAttribute('data-product-id') || button.getAttribute('data-id') || button.getAttribute('id');
            if (btnProductId && /^\d+$/.test(btnProductId)) {
              productId = btnProductId;
              break;
            }
          }
          
          // Método 2: Procurar nos formulários de produto
          const productForms = document.querySelectorAll('form[action*="/cart/add"]');
          for (const form of productForms) {
            const idInput = form.querySelector('input[name="id"]');
            if (idInput && idInput.value) {
              productId = idInput.value;
              break;
            }
          }
          
          // Método 3: Procurar no HTML completo da página (último recurso)
          if (!productId) {
            const bodyHTML = document.body.innerHTML;
            // Procurar padrões como product_id=12345 ou variant_id=12345
            const idMatches = bodyHTML.match(/product_id[=:"']+(\d+)/i) || 
                             bodyHTML.match(/variant_id[=:"']+(\d+)/i) ||
                             bodyHTML.match(/productId[=:"']+(\d+)/i) ||
                             bodyHTML.match(/variantId[=:"']+(\d+)/i);
            
            if (idMatches && idMatches[1]) {
              productId = idMatches[1];
            }
          }
        }
      }
      
      // Se ainda não temos um ID de produto, tentar extrair qualquer número da URL como último recurso
      if (!productId && window.location.pathname.includes('/products/')) {
        const anyNumberMatch = window.location.pathname.match(/\d+/);
        if (anyNumberMatch) {
          productId = anyNumberMatch[0];
        }
      }
      
      // Se ainda não encontramos o ID, verificar um padrão específico na URL do Shopify
      if (!productId && window.location.pathname.includes('/products/')) {
        // Extrair nome do produto da URL e usá-lo para buscar no HTML
        const productSlug = window.location.pathname.split('/products/')[1].split('?')[0];
        const cleanSlug = productSlug.replace(/[^\w\s]/gi, '');
        
        // Buscar no HTML da página por correspondências com o slug
        const bodyHTML = document.body.innerHTML;
        const slugMatches = bodyHTML.match(new RegExp(`product[_\\s\\-]*id[^\\d]*(\\d+)[^\\d]*${cleanSlug}`, 'i')) ||
                           bodyHTML.match(new RegExp(`${cleanSlug}[^\\d]*(\\d+)`, 'i'));
                           
        if (slugMatches && slugMatches[1]) {
          productId = slugMatches[1];
        }
      }
      
      console.log('Product ID detectado:', productId);
      console.log('Categorias detectadas:', productCategories);
      
      return {
        type: 'product',
        eventName: 'ViewContent',
        data: {
          contentName: productTitle || document.title.split('|')[0].trim(),
          contentType: 'product',
          contentCategory: productCategories,
          contentIds: productId ? [productId] : null,
          value: extractPrice() || 0
        }
      };
    }
    
    if (path.includes('/cart') || path.includes('/carrinho')) {
      // Extrair dados do carrinho
      let cartItems = [];
      let cartValue = 0;
      let numItems = 0;
      let cartCategories = [];
      
      // Função para extrair dados do carrinho
      function extractCartData() {
        try {
          // 1. Tentar obter dados do carrinho de objetos JSON em scripts
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            const content = script.textContent || '';
            
            // 1.1 Verificar scripts do Shopify que contêm dados do carrinho
            if (content.includes('cart') && (content.includes('items') || content.includes('line_items'))) {
              try {
                // Procurar padrões específicos do Shopify
                // window.ShopifyAnalytics.meta.product
                if (content.includes('ShopifyAnalytics')) {
                  // Tentar extrair produtos pelo padrão ShopifyAnalytics
                  const shopifyMetaMatch = content.match(/ShopifyAnalytics[\s\S]*?meta\s*=\s*(\{[\s\S]*?\});/);
                  if (shopifyMetaMatch && shopifyMetaMatch[1]) {
                    try {
                      const shopifyMeta = JSON.parse(shopifyMetaMatch[1]);
                      if (shopifyMeta.cart && shopifyMeta.cart.items && Array.isArray(shopifyMeta.cart.items)) {
                        console.log('Encontrado dados do carrinho em ShopifyAnalytics');
                        return processCartItems(shopifyMeta.cart.items, true);
                      }
                    } catch (e) {
                      console.error('Erro ao processar meta do ShopifyAnalytics:', e);
                    }
                  }
                }
                
                // Tentar encontrar e extrair objeto de carrinho JSON
                const cartMatch = content.match(/\{[^{]*"items"[\s\S]*?\}/);
                if (cartMatch) {
                  const cartData = JSON.parse(cartMatch[0]);
                  if (cartData.items && Array.isArray(cartData.items)) {
                    console.log('Encontrado dados do carrinho em script JSON');
                    return processCartItems(cartData.items, true);
                  }
                }
                
                // Tentar extrair do objeto window.cart
                const windowCartMatch = content.match(/window\.cart\s*=\s*(\{[\s\S]*?\});/);
                if (windowCartMatch) {
                  const cartData = JSON.parse(windowCartMatch[1]);
                  if (cartData.items && Array.isArray(cartData.items)) {
                    console.log('Encontrado dados do carrinho em window.cart');
                    return processCartItems(cartData.items, true);
                  }
                }
                
                // Padrão específico para Shopify
                const shopifyCartMatch = content.match(/window\.__INITIAL_STATE__[\s\S]*?items":\s*(\[[\s\S]*?\])/);
                if (shopifyCartMatch) {
                  const cartItems = JSON.parse(shopifyCartMatch[1]);
                  if (Array.isArray(cartItems) && cartItems.length > 0) {
                    console.log('Encontrado dados do carrinho em __INITIAL_STATE__');
                    return processCartItems(cartItems, true);
                  }
                }
              } catch (e) {
                console.error('Erro ao processar script de carrinho:', e);
              }
            }
          }
          
          // 2. Verificar se há objetos Shopify globais disponíveis
          if (window.Shopify && window.Shopify.theme && window.Shopify.theme.cart) {
            if (window.Shopify.theme.cart.items && Array.isArray(window.Shopify.theme.cart.items)) {
              console.log('Encontrado dados do carrinho em window.Shopify.theme.cart');
              return processCartItems(window.Shopify.theme.cart.items, true);
            }
          }
          
          // 3. Se ainda não encontrou, procurar elementos DOM de carrinho
          const cartItemElements = document.querySelectorAll('.cart-item, .cart__item, [data-cart-item], [id*="CartItem"], .line-item, [data-line-item]');
          if (cartItemElements.length > 0) {
            const items = [];
            cartItemElements.forEach(item => {
              try {
                const itemId = item.getAttribute('data-product-id') || 
                              item.getAttribute('data-variant-id') || 
                              item.getAttribute('data-item-id') || 
                              item.getAttribute('id')?.match(/\d+/)?.[0];
                
                // Tentar obter o título do produto              
                const titleEl = item.querySelector('.cart-item__name, .cart-item__title, .product-title, [data-cart-item-title], .item-title');
                const productTitle = titleEl ? titleEl.textContent.trim() : '';
                
                const quantityEl = item.querySelector('[data-quantity], [name*="quantity"], .quantity-selector, .cart-item__quantity');
                const quantity = quantityEl ? 
                  parseInt(quantityEl.value || quantityEl.textContent.trim()) : 1;
                
                const priceEl = item.querySelector('.price, [data-price], .cart-item__price, .product-price');
                let price = 0;
                if (priceEl) {
                  const priceText = priceEl.textContent.trim().replace(/[^\d.,]/g, '').replace(',', '.');
                  price = parseFloat(priceText);
                }
                
                if (itemId) {
                  items.push({
                    id: itemId,
                    quantity: quantity || 1,
                    price: price || 0,
                    title: productTitle // Adicionar título do produto
                  });
                }
              } catch (e) {
                console.error('Erro ao processar item do carrinho:', e);
              }
            });
            
            if (items.length > 0) {
              console.log('Encontrado dados do carrinho nos elementos DOM');
              return processCartItems(items);
            }
          }
          
          // 4. Se ainda não encontrou, tentar obter do HTML total da página
          const bodyHTML = document.body.innerHTML;
          
          // 4.1 Tentar extrair JSON do carrinho incorporado na página
          // Procurar por padrões como {"cart": {"items": [...]}}
          const jsonMatches = bodyHTML.match(/\{[\s\S]*?"cart"[\s\S]*?"items"[\s\S]*?\}/g);
          if (jsonMatches && jsonMatches.length > 0) {
            for (const match of jsonMatches) {
              try {
                const cartData = JSON.parse(match);
                if (cartData.cart && cartData.cart.items && Array.isArray(cartData.cart.items)) {
                  console.log('Encontrado dados do carrinho em JSON embutido na página');
                  return processCartItems(cartData.cart.items, true);
                }
              } catch (e) {
                // Ignorar erros de parse
              }
            }
          }
          
          // 4.2 Procurar padrões comuns que indicam valores de carrinho
          // Para Shopify e outros sistemas de carrinho populares
          const totalMatch = bodyHTML.match(/total[\s:"']*R?\$?\s*([\d.,]+)/i) || 
                            bodyHTML.match(/cart[\s-]*total[\s:"']*R?\$?\s*([\d.,]+)/i) ||
                            bodyHTML.match(/subtotal[\s:"']*R?\$?\s*([\d.,]+)/i);
          
          if (totalMatch && totalMatch[1]) {
            cartValue = parseFloat(totalMatch[1].replace(',', '.'));
          }
          
          // 4.3 Procurar padrões que indiquem quantidades
          const itemCountMatch = bodyHTML.match(/(\d+)\s*ite(?:m|ns)/i) || 
                               bodyHTML.match(/cart[\s-]*count[^\d]*(\d+)/i);
          
          if (itemCountMatch && itemCountMatch[1]) {
            numItems = parseInt(itemCountMatch[1]);
          }
          
          // 4.4 Procurar IDs de produtos no HTML
          const productDataMatches = [];
          
          // Procurar por IDs e títulos de produtos
          const productIdRegexes = [
            /"product_id":\s*"?(\d+)"?/g,
            /"variant_id":\s*"?(\d+)"?/g,
            /"product":\s*\{"id":\s*"?(\d+)"?,\s*"title":\s*"([^"]+)"/g,
            /"handle":\s*"([^"]+)"[\s\S]*?"id":\s*(\d+)/g
          ];
          
          for (const regex of productIdRegexes) {
            let match;
            while ((match = regex.exec(bodyHTML)) !== null) {
              let id, title;
              
              if (match.length >= 3) {
                // Se temos ID e título
                id = match[2] || match[1];
                title = match[1] || '';
              } else {
                // Se temos apenas ID
                id = match[1];
                title = '';
              }
              
              // Verificar se o ID já existe na lista
              const existingIndex = productDataMatches.findIndex(item => item.id === id);
              if (existingIndex === -1) {
                productDataMatches.push({ id, title, quantity: 1 });
              }
            }
          }
          
          if (productDataMatches.length > 0) {
            cartItems = productDataMatches;
          } else {
            // 4.5 Como último recurso, procurar IDs numéricos no URL
            const productIdMatches = Array.from(new Set(
              (bodyHTML.match(/product_id[=:"']+(\d+)/ig) || [])
                .concat(bodyHTML.match(/variant_id[=:"']+(\d+)/ig) || [])
                .concat(bodyHTML.match(/productId[=:"']+(\d+)/ig) || [])
                .concat(bodyHTML.match(/item_id[=:"']+(\d+)/ig) || [])
            ));
            
            if (productIdMatches.length > 0) {
              const uniqueIds = new Set();
              productIdMatches.forEach(match => {
                const id = match.match(/\d+/)[0];
                uniqueIds.add(id);
              });
              
              cartItems = Array.from(uniqueIds).map(id => ({ id, quantity: 1 }));
            }
          }
          
          // 4.6 Verificar categorias frequentes no HTML
          const knownCategories = ['palha', 'croche', 'crochê', 'couro', 'festa', 'bolsa'];
          knownCategories.forEach(category => {
            if (bodyHTML.toLowerCase().includes(category)) {
              cartCategories.push(category);
            }
          });
          
          return {
            items: cartItems,
            total: cartValue,
            quantity: numItems || cartItems.length,
            categories: cartCategories.length > 0 ? cartCategories : ['bolsa'], // Categoria padrão melhorada
            itemNames: cartItems.map(item => item.title).filter(title => title)
          };
        } catch (e) {
          console.error('Erro ao extrair dados do carrinho:', e);
          return { items: [], total: 0, quantity: 0, categories: ['cart'], itemNames: [] };
        }
      }
      
      // Função para processar os itens do carrinho
      function processCartItems(items, isShopify = false) {
        try {
          const processedItems = [];
          let total = 0;
          let quantity = 0;
          const categories = new Set();
          const itemNames = [];
          
          items.forEach(item => {
            // Extrair ID no formato correto do Shopify
            let id = '';
            if (isShopify) {
              // Se for do Shopify, priorizar product_id ou variant_id
              id = item.product_id || item.variant_id || item.id || '';
              // Se ainda não tiver ID e tiver handle, tentar extrair ID do handle
              if (!id && item.handle && item.handle.match(/\d+$/)) {
                id = item.handle.match(/\d+$/)[0];
              }
            } else {
              id = item.id || item.product_id || item.variant_id || item.sku || '';
            }
            
            // Extrair quantidade
            const qty = item.quantity || 1;
            
            // Extrair preço
            let price = item.price || item.line_price || 0;
            
            // Se o preço for em centavos (comum em APIs), converter para reais
            if (price > 1000 && !item.price_includes_taxes) {
              price = price / 100;
            }
            
            // Extrair título do produto
            let productTitle = '';
            if (item.title || item.product_title) {
              productTitle = item.title || item.product_title;
            } else if (item.product_title || item.name) {
              productTitle = item.product_title || item.name;
            }
            
            // Adicionar o título à lista se existir
            if (productTitle) {
              itemNames.push(productTitle);
            }
            
            // Extrair categoria do produto, se disponível
            if (item.product_type) {
              categories.add(item.product_type.toLowerCase());
            }
            
            if (item.categories || item.category) {
              const cats = item.categories || item.category;
              if (Array.isArray(cats)) {
                cats.forEach(c => categories.add(c.toLowerCase()));
              } else if (typeof cats === 'string') {
                categories.add(cats.toLowerCase());
              }
            }
            
            // Se o título do produto contiver uma categoria conhecida, adicioná-la
            if (productTitle) {
              const titleLower = productTitle.toLowerCase();
              const knownCategories = ['palha', 'croche', 'crochê', 'couro', 'festa', 'bolsa', 'bag', 'cesto'];
              for (const cat of knownCategories) {
                if (titleLower.includes(cat)) {
                  categories.add(cat === 'bag' ? 'bolsa' : cat);
                  break;
                }
              }
            }
            
            if (id) {
              processedItems.push({
                id,
                quantity: qty,
                item_price: price / qty
              });
              
              total += price;
              quantity += qty;
            }
          });
          
          // Determinar a categoria mais apropriada
          // Preferência: bolsa > palha > crochê > couro > festa > cart
          let primaryCategory = 'bolsa'; // Usar 'bolsa' como padrão para a Soleterra
          if (categories.size > 0) {
            const categoryPriority = ['bolsa', 'palha', 'croche', 'crochê', 'couro', 'festa', 'cart'];
            for (const cat of categoryPriority) {
              if (categories.has(cat)) {
                primaryCategory = cat;
                break;
              }
            }
          }
          
          return {
            items: processedItems,
            total,
            quantity,
            categories: [primaryCategory], // Usar apenas a categoria principal
            itemNames: itemNames.length > 0 ? itemNames : null
          };
        } catch (e) {
          console.error('Erro ao processar itens do carrinho:', e);
          return {
            items: [],
            total: 0,
            quantity: 0,
            categories: ['bolsa'], // Manter bolsa como padrão
            itemNames: []
          };
        }
      }
      
      // Extrair dados do carrinho
      const cartData = extractCartData();
      console.log('Dados do carrinho detectados:', cartData);
      
      // Verificar se o carrinho está vazio
      if (cartData.items.length === 0 && cartData.total === 0) {
        // Carrinho vazio
      return {
        type: 'cart', 
        eventName: 'ViewCart',
        data: {
            contentName: 'Carrinho Vazio',
            contentType: 'cart',
            contentCategory: ['cart'],
            value: 0,
            numItems: 0
          }
        };
      }
      
      // Criar array de content_ids a partir dos items
      const contentIds = cartData.items.map(item => item.id);
      
      return {
        type: 'cart',
        eventName: 'ViewCart',
        data: {
          contentName: cartData.itemNames || 'Shopping Cart',
          contentType: 'cart',
          contentCategory: cartData.categories,
          contentIds: contentIds,
          contents: cartData.items,
          value: cartData.total,
          numItems: cartData.quantity,
          currency: 'BRL'
        }
      };
    }
    
    if (path.includes('/collection') || path.includes('/colecao') || path.includes('/categoria')) {
      // Extrair o nome da coleção da URL
      let categoryName = 'category';
      
      // Tentar obter o nome da coleção da URL
      const pathParts = path.split('/');
      const lastSegment = pathParts[pathParts.length - 1];
      
      if (lastSegment && lastSegment !== 'collection' && lastSegment !== 'colecao' && lastSegment !== 'categoria') {
        // Converter formato da URL para um nome legível (ex: "mens-shoes" -> "Mens Shoes")
        categoryName = lastSegment
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      } else if (document.querySelector('h1')) {
        // Se não conseguir extrair da URL, tentar pegar do título da página
        const h1Text = document.querySelector('h1').textContent.trim();
        
        // Padrão comum em lojas: "Coleção: Nome da Coleção"
        if (h1Text.includes('Coleção:')) {
          categoryName = h1Text.split('Coleção:')[1].trim();
        } else if (h1Text.includes('Coleção')) {
          categoryName = h1Text.split('Coleção')[1].trim();
        } else if (h1Text.includes(':')) {
          categoryName = h1Text.split(':')[1].trim();
        } else {
          categoryName = h1Text;
        }
      } else if (document.title) {
        // Ou do título do documento
        categoryName = document.title.split('|')[0].trim();
        
        // Remover prefixos comuns: "Coleção: ", "Categoria: ", etc.
        if (categoryName.includes('Coleção:')) {
          categoryName = categoryName.split('Coleção:')[1].trim();
        } else if (categoryName.includes('Coleção')) {
          categoryName = categoryName.split('Coleção')[1].trim();
        }
      }
      
      // Se estamos na página específica da loja Soleterra, verificar se é uma das coleções conhecidas
      if (hostname.includes('soleterra.com.br')) {
        // Coleções conhecidas da Soleterra
        const knownCollections = ['Palha', 'Crochê', 'Couro', 'Festa'];
        
        // Verificar se o último segmento do path corresponde a uma coleção conhecida
        if (knownCollections.includes(lastSegment)) {
          categoryName = lastSegment;
        }
        
        // Verificar se há um H1 ou título que contenha uma das coleções conhecidas
        for (const collection of knownCollections) {
          if (document.body.innerHTML.includes(`Coleção: ${collection}`)) {
            categoryName = collection;
            break;
          }
        }
      }
      
      return {
        type: 'collection',
        eventName: 'ViewCategory',
        data: {
          contentName: 'Category Page',
          contentType: 'category',
          contentCategory: categoryName
        }
      };
    }
    
    if (path.includes('/search') || path.includes('/busca')) {
      const searchQuery = new URLSearchParams(window.location.search).get('q') || '';
      return {
        type: 'search',
        eventName: 'Pesquisar',
        data: {
          searchString: searchQuery,
          contentType: 'search'
        }
      };
    }
    
    // Tipo de página desconhecido
    return {
      type: 'other',
      eventName: 'PageView',
      data: {
        contentName: document.title,
        contentType: 'other'
      }
    };
  }

  // Hash simples para simular o que o TracLead faz
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Converter para string hexadecimal com 64 caracteres (como o TracLead)
    let hashString = Math.abs(hash).toString(16);
    while (hashString.length < 64) {
      hashString = hashString + Math.abs(Math.floor(Math.random() * 16)).toString(16);
    }
    return hashString;
  }
  
  // Função para hash SHA-256 usando SubtleCrypto API
  async function hashSHA256(data) {
    if (!data) return null;
    
    try {
      // Converter string para ArrayBuffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Calcular hash SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      
      // Converter ArrayBuffer para string hexadecimal
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (e) {
      console.error('Erro ao gerar hash SHA-256:', e);
      return hashString(data); // Fallback para a função hashString
    }
  }
  
  // Função para obter dados de geolocalização
  async function getGeoLocation() {
    try {
      // Tentar obter a localização do usuário através de API de geolocalização
      const geoData = await fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
          return fetch(`https://ipapi.co/${data.ip}/json/`)
            .then(response => response.json());
        });
      
      if (geoData) {
        return {
          country: geoData.country_code || null,
          state: geoData.region_code || null,
          city: geoData.city || null,
          zip: geoData.postal || null
        };
      }
    } catch (e) {
      console.log('Erro ao obter dados de geolocalização:', e);
    }
    
    return {
      country: null,
      state: null,
      city: null,
      zip: null
    };
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
      }
      
      // Se não temos dados geográficos, tentar obtê-los
      if (!userData.country || !userData.state || !userData.city || !userData.zip) {
        const geoData = await getGeoLocation();
        userData = { ...userData, ...geoData };
        
        // Salvar para uso futuro
        localStorage.setItem('meta_tracking_user_data', JSON.stringify({
          country: userData.country,
          state: userData.state,
          city: userData.city,
          zip: userData.zip
        }));
      }
    } catch (e) {
      console.log('Erro ao recuperar dados do usuário:', e);
    }
    
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

  // Enviar evento para o Pixel e para a API
  async function sendEvent(eventName, customData = {}) {
    // Definir variável para armazenar o eventId do backend
    let backendEventId = null;
    try {
      // Preparar Advanced Matching
      const visitorId = getOrCreateVisitorId(); // <-- Usar o novo ID first-party
      const client_user_agent_raw = navigator.userAgent;
      const client_user_agent_hashed = await hashSHA256(client_user_agent_raw);

      // Obter cookies do Facebook
      // Tentar obter o FBP do cookie ou parâmetro de URL
      const fbp_cookie_or_param = getCookie('_fbp') || getUrlParameter('fbp');
      // Validar/Gerar o FBP - A função validateFbp agora garante que sempre teremos um FBP válido
      const fbp = validateFbp(fbp_cookie_or_param); 
      const fbc = getCookie('_fbc') || getUrlParameter('fbc') || getUrlParameter('fbclid') || null;

      // Obter informações adicionais do usuário
      const userData = await getUserData();

      // --- Envio para o Backend /track PRIMEIRO para obter eventId ---
      const eventDataForBackend = {
        eventName: eventName,
        userData: {
          userAgent: client_user_agent_raw, // Enviar não hasheado para o backend
          language: navigator.language || 'pt-BR',
          fbp: fbp,
          fbc: fbc,
          visitorId: visitorId, // <-- Enviar o ID do cookie first-party
          userId: window.metaTrackingUserId || null, // Enviar ID de usuário logado se existir
          referrer: document.referrer,
          ...userData // Adiciona geo (country, state, city, zip) e outros se coletados
        },
        customData: {
          ...customData, // Adiciona dados específicos do evento (conteúdo, valor, etc.)
          sourceUrl: window.location.href
        }
      };

      // Enviar para a API backend e obter resposta (incluindo eventId)
      const backendResponse = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventDataForBackend)
      });

      if (!backendResponse.ok) {
        console.error(`Erro na resposta do backend /track: ${backendResponse.status}`);
        // Considerar se deve continuar com o envio do pixel mesmo com erro no backend
      } else {
        const backendResult = await backendResponse.json();
        if (backendResult && backendResult.eventId) {
          backendEventId = backendResult.eventId; // <-- Capturar o eventId do backend
          console.log(`Backend respondeu com eventId: ${backendEventId}`);
        } else {
          console.warn('Backend não retornou eventId');
        }
      }

      // --- Construção e Envio do Pixel Manual (Usando eventId do backend) ---

      // Inicializar o pixel (pode ser redundante se já inicializado, mas garante)
      fbq('init', PIXEL_ID);

      // Construir URL do Pixel manualmente
      const pixelUrl = 'https://www.facebook.com/tr/';
      const baseParams = new URLSearchParams({
        id: PIXEL_ID,
        ev: eventName, // Usar nome original do evento
        dl: document.location.href,
        rl: document.referrer,
        if: false,
        ts: Date.now(),
        // v: '2.9.194', // Versão pode ser omitida ou atualizada
        r: 'stable',
        // Usar o eventId recebido do backend se disponível, senão gerar um fallback
        eid: backendEventId || ('meta_tracking_fe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8))
      });

      // Adicionar Advanced Matching (hasheado) para o Pixel
      const idToHashForPixel = window.metaTrackingUserId || visitorId;
      const externalIdHashed = await hashSHA256(idToHashForPixel);
      baseParams.append('ud[external_id]', externalIdHashed);
      baseParams.append('ud[client_user_agent]', client_user_agent_hashed);
      baseParams.append('ud[fbp]', fbp);
      if (fbc) {
        baseParams.append('ud[fbc]', fbc);
      }

      // Função interna para adicionar dados hasheados ao baseParams
      const addHashedDataToPixel = async (name, value) => {
        if (value) {
          try {
            // Normalizar e Hashear para o Pixel
            let normalizedValue = String(value).toLowerCase().trim();
            if (name === 'ph') normalizedValue = normalizedValue.replace(/\D/g, '');
            if (name === 'zp') normalizedValue = normalizedValue.replace(/\D/g, '');
            const hashedValue = await hashSHA256(normalizedValue);
            baseParams.append(`ud[${name}]`, hashedValue);
          } catch (e) {
            console.error(`Erro ao processar ${name} para Pixel:`, e);
          }
        }
      };

      // Adicionar geo e PII hasheados para o Pixel
      await addHashedDataToPixel('country', userData.country);
      await addHashedDataToPixel('st', userData.state);
      await addHashedDataToPixel('ct', userData.city);
      await addHashedDataToPixel('zp', userData.zip);
      await addHashedDataToPixel('em', userData.email);
      await addHashedDataToPixel('ph', userData.phone);
      await addHashedDataToPixel('fn', userData.firstName);
      await addHashedDataToPixel('ln', userData.lastName);
      await addHashedDataToPixel('ge', userData.gender);
      await addHashedDataToPixel('db', userData.dateOfBirth);

      // Adicionar custom data (não hasheado) para o Pixel
      const customDataForPixel = {
          ...customData,
          app: 'meta-tracking',
          language: navigator.language || 'pt-BR',
          referrer: document.referrer
          // Não precisa adicionar sourceUrl, etc., pois já estão nos parâmetros base (dl, rl)
      };

      Object.entries(customDataForPixel).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            baseParams.append(`cd[${key}]`, JSON.stringify(value));
          } else {
            baseParams.append(`cd[${key}]`, value);
          }
        }
      });

      // Enviar o pixel manualmente usando um image request
      const pixelImg = new Image();
      pixelImg.src = `${pixelUrl}?${baseParams.toString()}`;
      console.log(`Pixel ${eventName} enviado manualmente (ID: ${baseParams.get('eid')})`);

      // Retornar o resultado do backend
      if (backendEventId) {
          return { eventId: backendEventId }; // Retornar o ID do backend se sucesso
      }

    } catch (error) {
      console.error('Erro geral ao enviar evento:', error);
      return null;
    }
  }

  // Função para monitorar rolagem da página
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
  
  // Função para iniciar timer de 1 minuto
  function setupTimerTracking() {
    setTimeout(function() {
      if (!sentEvents.timer_1min) {
        sentEvents.timer_1min = true;
        sendEvent('Timer_1min', {
          timeOnPage: 60, // segundos
          pageUrl: window.location.href,
          contentName: document.title
        });
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

  // Função principal - detecta a página e envia os eventos
  function init() {
    // Carrega script fbevents.js e inicializa o pixel (o PageView já foi disparado na função initFacebookPixel)
    initFacebookPixel();
    
    // Detecta o tipo de página
    const pageInfo = detectPageType();
    if (pageInfo && pageInfo.eventName !== 'PageView') {
      // Adiciona um atraso antes de enviar o evento inicial, mas apenas se não for PageView
      // pois o PageView já foi enviado na inicialização do pixel
      console.log(`Atrasando envio do evento inicial "${pageInfo.eventName}" por 750ms para permitir a inicialização de cookies.`);
      setTimeout(() => {
        console.log(`Enviando evento inicial "${pageInfo.eventName}" após atraso.`);
        sendEvent(pageInfo.eventName, pageInfo.data); 
      }, 750); // Atraso de 750 milissegundos
    } else if (!pageInfo) {
      // Se nenhum tipo específico for detectado, não enviamos PageView novamente como fallback
      // pois o PageView já foi enviado na inicialização do pixel
      console.log('Nenhum tipo de página específico detectado. PageView já foi enviado na inicialização.');
    }

    // Configurar outros rastreadores (scroll, timer, etc.) - Isso pode continuar fora do timeout
    setupScrollTracking();
    setupTimerTracking();
    setupVideoTracking();
    setupLeadTracking();
    
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
          const priceMatch = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
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
})(); 