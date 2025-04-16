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
        console.log('[Meta Tracking] FBQ já inicializado.');
        // Não retornar, pois precisamos garantir que nossos dados sejam enviados
        // A lógica do fbevents.js lida com múltiplas chamadas init para o mesmo pixel.
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
    console.log('[Meta Tracking] Script fbevents.js sendo carregado...');

    // --- ETAPA 3: Preparar dados e ENFILEIRAR chamada init --- 

    const pageViewEventId = generateUUID(); // Gerar ID para backend e desduplicação CAPI
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

    // Montar parâmetros para init (sem hash)
    const pixelParams = {
      external_id: externalId, fbp: fbp, fbc: fbc,
      client_user_agent: navigator.userAgent,
      em: email, ph: phone, fn: firstName, ln: lastName,
      ge: gender, db: dob, ct: city, st: state, zp: zip, country: country
    };
    Object.keys(pixelParams).forEach(key => pixelParams[key] == null && delete pixelParams[key]);

    // ENFILEIRAR init (dispara PageView automático SEM eventID visível no helper, mas o FB usa internamente)
    fbq('init', PIXEL_ID, pixelParams);
    console.log(`[Meta Tracking] fbq('init') enfileirado.`, pixelParams);

    // --- ETAPA 4: Enviar PageView para Backend ---
    // Prepara os dados customizados básicos do PageView para o backend
     const pageViewCustomDataForBackend = {
        app: 'meta-tracking',
        contentName: document.title || 'Page View',
        contentType: 'page_view', // Usar um tipo consistente para backend
        language: navigator.language || 'pt-BR',
        referrer: document.referrer || ''
     };
    Object.keys(pageViewCustomDataForBackend).forEach(key => pageViewCustomDataForBackend[key] == null && delete pageViewCustomDataForBackend[key]);

    const allRawUserDataForInit = {
        external_id: externalId, visitorId: getOrCreateVisitorId(),
        fbp: fbp, fbc: fbc, em: email, ph: phone, fn: firstName, ln: lastName,
        ge: gender, db: dob, ct: city, st: state, zp: zip, country: country
    };
    // Pequeno delay pode ajudar a garantir que IDs como fbp foram setados pelo init
    setTimeout(function() {
         sendEventToBackend('PageView', allRawUserDataForInit, pageViewCustomDataForBackend, pageViewEventId);
    }, 150); 

  }

  // Funções para encontrar elementos específicos na página
  function getProductDetails() {
    // Tenta detectar informações de produtos
    console.log('[Meta Tracking] getProductDetails chamado.');

    let data = {
      content_ids: [],
      content_name: '',
      content_category: '', // Usar string única ou primeira categoria
      content_type: 'product',
      value: 0,
      currency: 'BRL', // Assumir BRL, ajustar se necessário
      contents: [],
      num_items: 1 // Para ViewContent, é sempre 1 item
    };

    let productId = null;
    let productCategories = [];

    // Prioridade 1: JSON-LD
    const jsonLDElements = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLDElements.forEach(script => {
      try {
        const jsonData = JSON.parse(script.textContent);
        const product = Array.isArray(jsonData)
          ? jsonData.find(item => item['@type'] === 'Product')
          : (jsonData['@type'] === 'Product' ? jsonData : null);

        if (product) {
          console.log('[Meta Tracking] Encontrado JSON-LD de Produto.');
          if (product.productID) productId = product.productID;
          else if (product.sku) productId = product.sku;
          else if (product.mpn) productId = product.mpn;
          else if (product.gtin) productId = product.gtin;
          else if (product.offers && product.offers.sku) productId = product.offers.sku;
          else if (product.offers && Array.isArray(product.offers) && product.offers[0] && product.offers[0].sku) productId = product.offers[0].sku;


          if (product.name) data.content_name = product.name.trim();

          if (product.category) {
              if (typeof product.category === 'string') {
                  productCategories = product.category.split('/').map(c => c.trim()).filter(c => c);
              } else if (Array.isArray(product.category)) {
                  productCategories = product.category.map(c => String(c).trim()).filter(c => c);
              }
          }

          if (product.offers) {
            const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            if (offer && offer.price) data.value = parseFloat(offer.price);
            if (offer && offer.priceCurrency) data.currency = offer.priceCurrency;
          }
          // Parar se encontrou dados suficientes no JSON-LD
          if (productId && data.content_name && data.value > 0) {
               console.log('[Meta Tracking] Dados do Produto obtidos via JSON-LD.');
              // return; // Não retorna, apenas preenche, pode haver mais fontes
          }
        }
      } catch (e) {
        console.warn('[Meta Tracking] Erro ao processar JSON-LD:', e);
      }
    });

    // Prioridade 2: Seletores DOM (Fallback ou complemento)

    // ID do produto (se não encontrado via JSON-LD)
    if (!productId) {
      // Tentar extrair do URL para Shopify ou similar (?variant=...)
      const variantParam = new URLSearchParams(window.location.search).get('variant');
      if (variantParam) {
        productId = variantParam;
      } else {
         // Tentar seletores comuns (Inputs, data attributes) - AJUSTAR PARA SOLETERRA.COM.BR
        const idElement = document.querySelector('input[name="id"], input[name="product-id"], input[name="variantId"], [data-product-id], [data-variant-id], form[action*="/cart/add"] [name="id"]');
         if (idElement) {
           productId = idElement.value || idElement.getAttribute('data-product-id') || idElement.getAttribute('data-variant-id');
         }
      }
       console.log('[Meta Tracking] ID do Produto (DOM/URL Fallback):', productId);
    }


    // Nome do produto (se não encontrado via JSON-LD)
    if (!data.content_name) {
       // Tentar H1 ou título da página - AJUSTAR SELETOR H1 SE NECESSÁRIO
       const h1 = document.querySelector('h1, .product-title, .product_title, .product--name');
       if (h1) {
         data.content_name = h1.textContent.trim();
       } else if (document.title) {
          // Evitar usar 'Show' ou títulos genéricos
          const potentialTitle = document.title.split('|')[0].trim();
          if (potentialTitle.toLowerCase() !== 'show' && potentialTitle.length > 3) {
               data.content_name = potentialTitle;
          }
       }
        console.log('[Meta Tracking] Nome do Produto (DOM/Title Fallback):', data.content_name);
    }

    // Categorias (se não encontrado via JSON-LD)
     if (productCategories.length === 0) {
         // Tentar breadcrumbs - AJUSTAR SELETORES PARA SOLETERRA.COM.BR
         const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a, .breadcrumb-item a, nav[aria-label="breadcrumb"] a');
         if (breadcrumbs.length > 0) {
             // Pegar todos exceto o último (geralmente o produto) ou penúltimo se o último for o produto
             let limit = breadcrumbs.length -1;
             // Verificação se o último elemento do breadcrumb é igual ao nome do produto, para não incluí-lo como categoria
             if (breadcrumbs[limit] && data.content_name && breadcrumbs[limit].textContent.trim().toLowerCase() === data.content_name.toLowerCase()) {
                 limit = breadcrumbs.length - 2;
             }
             for (let i = 0; i <= limit; i++) {
                 const category = breadcrumbs[i].textContent.trim();
                 if (category && !['Home', 'Início', 'Principal', 'Produtos'].includes(category)) {
                     productCategories.push(category.toLowerCase());
                 }
             }
         }
          console.log('[Meta Tracking] Categorias (Breadcrumb Fallback):', productCategories);
     }
     // Definir content_category como a última categoria encontrada (mais específica)
     data.content_category = productCategories.length > 0 ? productCategories[productCategories.length - 1] : '';


     // Preço (se não encontrado via JSON-LD)
     if (data.value <= 0) {
         // Tentar seletores comuns - AJUSTAR PARA SOLETERRA.COM.BR
         const priceElement = document.querySelector('.price, .product-price, [itemprop="price"], .price__value, .product__price');
         if (priceElement) {
             let priceText = priceElement.getAttribute('content') || priceElement.textContent; // Priorizar 'content' se for meta tag
             priceText = priceText.trim().replace(/[^0-9,.]/g, '');
             // Lidar com separador decimal , ou .
             if (priceText.includes(',') && priceText.includes('.')) { // Ex: 1.234,56
                 priceText = priceText.replace('.', '').replace(',', '.');
             } else { // Ex: 1234,56 ou 1234.56
                priceText = priceText.replace(',', '.');
             }
             data.value = parseFloat(priceText) || 0;
             console.log('[Meta Tracking] Preço (DOM Fallback):', data.value);
         }
     }

     // Moeda (se não encontrada e o preço foi encontrado)
     if (data.value > 0 && !data.currency) {
          // Tentar encontrar no texto do preço ou elemento próximo - AJUSTAR
         const currencySymbolElement = document.querySelector('.price__currency, .product-price__currency');
          if (currencySymbolElement && currencySymbolElement.textContent.trim() === 'R$') {
               data.currency = 'BRL';
          } else {
               data.currency = 'BRL'; // Default para BRL se não encontrar
          }
          console.log('[Meta Tracking] Moeda (DOM/Default Fallback):', data.currency);
      }


     // Montar dados finais
     if (productId) {
         data.content_ids = [String(productId)]; // Garantir que seja string
         // Montar 'contents' para ViewContent
         data.contents = [{
             id: String(productId),
             quantity: 1, // Sempre 1 para ViewContent
             item_price: data.value // Preço unitário
         }];
     } else {
          console.warn('[Meta Tracking] Não foi possível encontrar o ID do produto.');
          // Se não há ID, talvez não enviar o evento ViewContent? Ou enviar sem ID?
          // Por ora, enviará sem ID, mas idealmente deveria ter.
           data.content_ids = [];
           data.contents = [];
           data.num_items = 0;
     }


     // Limpar dados nulos ou vazios antes de retornar
     Object.keys(data).forEach(key => {
         if (data[key] === null || data[key] === undefined || data[key] === '') {
             // Permitir value 0? Geralmente não para produtos. Manter se for 0.
             if (key !== 'value' && key !== 'num_items') {
                delete data[key];
             }
         }
          // Garantir que arrays vazios não sejam enviados onde não fazem sentido
          if (Array.isArray(data[key]) && data[key].length === 0 && ['content_ids', 'contents'].includes(key)) {
              delete data[key];
          }
     });

     console.log('[Meta Tracking] Dados Finais getProductDetails:', data);
     return data;
  }

  // Detecta o tipo de página
  function detectPageType() {
    console.log('[Meta Tracking] detectPageType chamado para:', window.location.href);
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    const search = window.location.search;

    // 1. Página de Confirmação de Compra (Maior Prioridade)
     // AJUSTAR SELETORES/LÓGICA PARA DETECTAR COMPRA FINALIZADA EM SOLETERRA.COM.BR
    if (path.includes('/checkout/obrigado') || path.includes('/pedido/confirmado') || path.includes('/order/confirmation') || path.includes('/success') || path.includes('/thank_you') || document.querySelector('[data-order-summary]')) {
         console.log('[Meta Tracking] Detectado: Página de Compra (Purchase)');
         // TODO: Implementar extração de dados da compra (order_id, value, currency, contents)
         // Geralmente requer acesso a dados do pedido (dataLayer, variáveis JS, ou DOM)
         return {
            type: 'purchase',
            eventName: 'Purchase', // Nome Padrão FB
            data: {
               contentType: 'purchase',
               contentName: 'Purchase Confirmation',
               // Tentar obter ID do pedido da URL
               orderId: getUrlParameter('order_id') || getUrlParameter('pedido')
            }
         };
    }
    
    // 2. Página de Checkout (Iniciar Checkout / Adicionar Info Pagamento)
    // AJUSTAR PARA SOLETERRA.COM.BR
    if (path.includes('/checkout') || path.includes('/carrinho/finalizar') || hostname.includes('checkout.')) {
         // Diferenciar entre InitiateCheckout e AddPaymentInfo pode ser difícil sem mais contexto
         // Vamos usar InitiateCheckout como padrão para qualquer página de checkout antes da confirmação
         console.log('[Meta Tracking] Detectado: Página de Checkout (InitiateCheckout)');

          // Tentar extrair dados do carrinho/checkout para InitiateCheckout
          const checkoutData = extractCartData(true); // true indica que estamos no checkout

          return {
              type: 'checkout',
              eventName: 'InitiateCheckout', // Nome Padrão FB
              data: {
                  contentType: 'checkout',
                  contentName: 'Initiate Checkout',
                  ...checkoutData // Inclui value, currency, content_ids, contents, num_items
              }
          };
    }
    
    // 3. Página do Carrinho
    // AJUSTAR PARA SOLETERRA.COM.BR
    if (path === '/cart' || path === '/carrinho' || path.includes('/cart') || path.includes('/carrinho')) {
        console.log('[Meta Tracking] Detectado: Página do Carrinho (InitiateCheckout)');
        // Usar InitiateCheckout também para visualização do carrinho, pois é o início do funil
        // Ou poderia ser um evento customizado 'ViewCart' se preferir separar
        const cartData = extractCartData(); // Extrai dados do carrinho

        return {
          type: 'cart',
          eventName: 'InitiateCheckout', // Opção: Usar evento padrão FB (recomendado)
          data: {
            contentType: 'cart', // Manter contentType descritivo
            contentName: 'View Cart',
            ...cartData // Inclui value, currency, content_ids, contents, num_items
          }
        };
    }
    
    // 4. Página de Produto
    // AJUSTAR PARA SOLETERRA.COM.BR (ex: /produto/, /item/)
    if (path.includes('/product/') || path.includes('/produto/') || document.querySelector('body.template-product, body.produto')) {
        console.log('[Meta Tracking] Detectado: Página de Produto (ViewContent)');
        const productData = getProductDetails();
        return {
          type: 'product',
          eventName: 'ViewContent', // Nome Padrão FB
          data: productData // Já formatado por getProductDetails
        };
    }
    
    // 5. Página de Categoria
    // AJUSTAR PARA SOLETERRA.COM.BR (ex: /categoria/, /colecao/, /departamento/)
    if (path.includes('/category/') || path.includes('/categoria/') || path.includes('/collection/') || path.includes('/colecao/') || path.includes('/collections/') || path.includes('/departamento/') || document.querySelector('body.template-collection, body.categoria')) {
         console.log('[Meta Tracking] Detectado: Página de Categoria (ViewCategory)');
         let categoryData = {
             content_ids: [],
             contentCategory: [],
             contentNames: []
         };
         
         // Tentar obter o nome da coleção da URL
         const pathParts = path.split('/');
         const lastSegment = pathParts[pathParts.length - 1];
         
         if (lastSegment && lastSegment !== 'collection' && lastSegment !== 'colecao' && lastSegment !== 'categoria') {
             // Converter formato da URL para um nome legível (ex: "mens-shoes" -> "Mens Shoes")
             categoryData.contentCategory.push(lastSegment
               .replace(/-/g, ' ')
               .replace(/_/g, ' ')
               .replace(/\b\w/g, l => l.toUpperCase()));
         } else if (document.querySelector('h1')) {
             // Se não conseguir extrair da URL, tentar pegar do título da página
             const h1Text = document.querySelector('h1').textContent.trim();
             
             // Padrão comum em lojas: "Coleção: Nome da Coleção"
             if (h1Text.includes('Coleção:')) {
               categoryData.contentNames.push(h1Text.split('Coleção:')[1].trim());
             } else if (h1Text.includes('Coleção')) {
               categoryData.contentNames.push(h1Text.split('Coleção')[1].trim());
             } else if (h1Text.includes(':')) {
               categoryData.contentNames.push(h1Text.split(':')[1].trim());
             } else {
               categoryData.contentNames.push(h1Text);
             }
         } else if (document.title) {
             // Ou do título do documento
             categoryData.contentNames.push(document.title.split('|')[0].trim());
             
             // Remover prefixos comuns: "Coleção: ", "Categoria: ", etc.
             if (categoryData.contentNames[0].includes('Coleção:')) {
               categoryData.contentNames[0] = categoryData.contentNames[0].split('Coleção:')[1].trim();
             } else if (categoryData.contentNames[0].includes('Coleção')) {
               categoryData.contentNames[0] = categoryData.contentNames[0].split('Coleção')[1].trim();
             }
         }
         
         // Se estamos na página específica da loja Soleterra, verificar se é uma das coleções conhecidas
         if (hostname.includes('soleterra.com.br')) {
             // Coleções conhecidas da Soleterra
             const knownCollections = ['Palha', 'Crochê', 'Couro', 'Festa'];
             
             // Verificar se o último segmento do path corresponde a uma coleção conhecida
             if (knownCollections.includes(lastSegment)) {
               categoryData.contentNames.push(lastSegment);
             }
             
             // Verificar se há um H1 ou título que contenha uma das coleções conhecidas
             for (const collection of knownCollections) {
               if (document.body.innerHTML.includes(`Coleção: ${collection}`)) {
                 categoryData.contentNames.push(collection);
                 break;
               }
             }
         }
         
         // 6. Tentar obter categoria a partir do último caminho da URL referenciadora
         if (categoryData.contentCategory.length === 0 && document.referrer) {
             try {
               const referrerUrl = new URL(document.referrer);
               const referrerPath = referrerUrl.pathname;
               if (referrerPath.includes('/collection') || referrerPath.includes('/categoria') || referrerPath.includes('/collections')) {
                 const referrerParts = referrerPath.split('/');
                 const lastReferrerSegment = referrerParts[referrerParts.length - 1];
                 if (lastReferrerSegment && !['collection', 'collections', 'categoria'].includes(lastReferrerSegment)) {
                   categoryData.contentCategory.push(lastReferrerSegment
                     .replace(/-/g, ' ')
                     .replace(/_/g, ' ')
                     .toLowerCase());
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
             if (categoryData.contentNames.length > 0) {
               categoryData.contentNames.forEach(title => {
                 const titleLower = title.toLowerCase();
                 for (const collection of knownCollections) {
                   if (titleLower.includes(collection)) {
                     categoryData.contentCategory.push(collection);
                     break;
                   }
                 }
               });
             }
             
             // Tentar extrair o ID do produto usando a convenção da Soleterra
             if (!categoryData.content_ids.length && lastSegment) {
               // Verificar se há algum número no final do último segmento
               const matches = lastSegment.match(/\d+/g);
               if (matches && matches.length > 0) {
                 categoryData.content_ids.push(matches[matches.length - 1]);
               }
             }
             
             // Verificações específicas para o site Soleterra
             if (!categoryData.content_ids.length) {
               // Método 1: Procurar botões de adição ao carrinho que contêm IDs de produtos
               const addToCartButtons = document.querySelectorAll('button[name="add"], [data-product-id], .add-to-cart, [data-button-action="add-to-cart"]');
               for (const button of addToCartButtons) {
                 const btnProductId = button.getAttribute('data-product-id') || button.getAttribute('data-id') || button.getAttribute('id');
                 if (btnProductId && /^\d+$/.test(btnProductId)) {
                   categoryData.content_ids.push(btnProductId);
                   break;
                 }
               }
               
               // Método 2: Procurar nos formulários de produto
               const productForms = document.querySelectorAll('form[action*="/cart/add"]');
               for (const form of productForms) {
                 const idInput = form.querySelector('input[name="id"]');
                 if (idInput && idInput.value) {
                   categoryData.content_ids.push(idInput.value);
                   break;
                 }
               }
               
               // Método 3: Procurar no HTML completo da página (último recurso)
               if (!categoryData.content_ids.length) {
                 const bodyHTML = document.body.innerHTML;
                 // Procurar padrões como product_id=12345 ou variant_id=12345
                 const idMatches = bodyHTML.match(/product_id[=:"']+(\d+)/i) || 
                                  bodyHTML.match(/variant_id[=:"']+(\d+)/i) ||
                                  bodyHTML.match(/productId[=:"']+(\d+)/i) ||
                                  bodyHTML.match(/variantId[=:"']+(\d+)/i);
                 
                 if (idMatches && idMatches[1]) {
                   categoryData.content_ids.push(idMatches[1]);
                 }
               }
             }
         }
         
         // Se ainda não temos um ID de produto, tentar extrair qualquer número da URL como último recurso
         if (!categoryData.content_ids.length && window.location.pathname.includes('/products/')) {
           const anyNumberMatch = window.location.pathname.match(/\d+/);
           if (anyNumberMatch) {
             categoryData.content_ids.push(anyNumberMatch[0]);
           }
         }
         
         // Se ainda não encontramos o ID, verificar um padrão específico na URL do Shopify
         if (!categoryData.content_ids.length && window.location.pathname.includes('/products/')) {
           // Extrair nome do produto da URL e usá-lo para buscar no HTML
           const productSlug = window.location.pathname.split('/products/')[1].split('?')[0];
           const cleanSlug = productSlug.replace(/[^\w\s]/gi, '');
           
           // Buscar no HTML da página por correspondências com o slug
           const bodyHTML = document.body.innerHTML;
           const slugMatches = bodyHTML.match(new RegExp(`product[_\\s\\-]*id[^\\d]*(\\d+)[^\\d]*${cleanSlug}`, 'i')) ||
                              bodyHTML.match(new RegExp(`${cleanSlug}[^\\d]*(\\d+)`, 'i'));
                               
           if (slugMatches && slugMatches[1]) {
             categoryData.content_ids.push(slugMatches[1]);
           }
         }
         
         console.log('Product ID detectado:', categoryData.content_ids);
         console.log('Categorias detectadas:', categoryData.contentCategory);
         
         return {
           type: 'category',
           eventName: 'ViewCategory', // Nome Padrão FB
           data: categoryData
         };
    }
    
    if (path.includes('/search') || path.includes('/busca')) {
      const searchQuery = new URLSearchParams(window.location.search).get('q') || '';
      console.log('[Meta Tracking] Detectado: Resultados de Pesquisa (Search)');
       // TODO: Idealmente, extrair content_ids e contents dos resultados, similar a ViewCategory
      return {
        type: 'search_results',
        eventName: 'Search', // Nome Padrão FB
        data: {
          search_string: searchQuery, // Parâmetro padrão
          contentType: 'search_results',
          contentNames: [searchQuery]
        }
      };
    }
    
    // 7. Página Home
    if (path === '/' || path === '' || path === '/home' || path === '/index.html') {
      console.log('[Meta Tracking] Detectado: Home Page (Usando PageView)');
      // Para a Home Page, o evento PageView já é suficiente.
      // Podemos adicionar parâmetros customizados específicos se necessário,
      // mas geralmente não se envia um evento separado como 'ViewHome'.
      // Retornar null ou um tipo 'home' para que 'init' saiba que é a home, mas sem disparar evento extra.
      // O PageView já foi enviado pelo initFacebookPixel.
      return {
          type: 'home',
          eventName: null, // Não dispara evento adicional além do PageView
          data: {}
      };
    }
    
    console.log('[Meta Tracking] Detectado: Página Genérica (Usando PageView)');
     // O PageView já foi enviado pelo initFacebookPixel.
    return {
        type: 'generic',
        eventName: null, // Não dispara evento adicional
        data: {}
    };
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
    try {
      console.log(`[Frontend Script] Disparando evento: ${eventName}`);

      // --- ETAPA 1: Gerar eventID ANTES --- 
      const eventId = generateUUID(); // Gerar ID único para este evento

      // --- ETAPA 2: Coletar IDs e Dados do Usuário (sem hash) ---
      const visitorId = getOrCreateVisitorId();
      const externalId = getExternalId();
      const fbp = validateFbp(getCookie('_fbp') || getUrlParameter('fbp'));
      const fbc = getCookie('_fbc') || getUrlParameter('fbclid') || null;

      const localStorageUserData = {
          em: localStorage.getItem('meta_tracking_email'),
          ph: localStorage.getItem('meta_tracking_phone'),
          fn: localStorage.getItem('meta_tracking_first_name'),
          ln: localStorage.getItem('meta_tracking_last_name'),
          ge: localStorage.getItem('meta_tracking_gender'),
          db: localStorage.getItem('meta_tracking_dob'),
          ct: localStorage.getItem('meta_tracking_city'),
          st: localStorage.getItem('meta_tracking_state'),
          zp: localStorage.getItem('meta_tracking_zip'),
          country: localStorage.getItem('meta_tracking_country')
      };

      const allRawUserData = {
          external_id: externalId,
          visitorId: visitorId,
          fbp: fbp,
          fbc: fbc,
          ...localStorageUserData
      };

      // --- ETAPA 3: Enviar para o Pixel do Facebook (fbq) com eventID ---
      const fbqParams = { ...customData }; 
      const fbqOptions = { eventID: eventId }; // <-- Objeto de opções com eventID

      if (typeof fbq === 'function') {
          // <<< Passar fbqOptions como TERCEIRO argumento >>>
          fbq('track', eventName, fbqParams, fbqOptions); 
          console.log(`[Frontend Script] fbq('track', '${eventName}') chamado com eventID: ${eventId}`, fbqParams);
      } else {
          console.warn('[Frontend Script] fbq não definido ao tentar rastrear evento.');
      }

      // --- ETAPA 4: Enviar dados brutos para o Backend (/track) com o MESMO eventID ---
      // A função sendEventToBackend já recebe e usa o eventId gerado no passo 1
      await sendEventToBackend(eventName, allRawUserData, customData, eventId);

    } catch (error) {
      console.error(`[Frontend Script] Erro geral na função sendEvent para ${eventName}:`, error);
    }
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

  // Função principal - detecta a página e envia os eventos
  function init() {
    console.log('[Meta Tracking] Inicializando script v1.5...');
    initFacebookPixel(); // Carrega FBQ, envia init e PageView para backend

    // Detectar tipo de página APÓS o init ter sido enfileirado
    // Adicionar um pequeno delay para garantir que o DOM esteja mais estável
    setTimeout(() => {
         const pageInfo = detectPageType();

         if (pageInfo && pageInfo.eventName) {
             // Se detectou um evento específico (ViewContent, ViewCategory, InitiateCheckout, etc.)
             // que não seja o PageView básico, envia esse evento.
             console.log(`[Meta Tracking] Enviando evento detectado: ${pageInfo.eventName}`);
             sendEvent(pageInfo.eventName, pageInfo.data);
         } else if (pageInfo) {
              // Se pageInfo existe mas eventName é null (ex: home, generic)
              console.log(`[Meta Tracking] Tipo de página: ${pageInfo.type}. Nenhum evento adicional enviado via sendEvent (PageView tratado no init).`);
         } else {
              // Se pageInfo for null/undefined (erro na detecção?)
              console.warn('[Meta Tracking] pageInfo não retornado por detectPageType.');
         }

          // Configurar rastreamentos adicionais (scroll, timer, etc.)
          setupScrollTracking();
          setupTimerTracking();
          setupVideoTracking();
          setupLeadTracking();
    }, 100); // Atraso de 100 milissegundos
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

  // Função para extrair dados do carrinho (Refatorada)
  // isCheckout: boolean indica se estamos na página de checkout (pode ter estrutura diferente)
  function extractCartData(isCheckout = false) {
    console.log(`[Meta Tracking] extractCartData chamado (isCheckout: ${isCheckout})`);
    let cartData = {
        content_ids: [],
        contents: [],
        value: 0,
        currency: 'BRL', // Assumir BRL
        num_items: 0
    };
    let totalValue = 0;
    let itemCount = 0;

    // Tentar encontrar itens do carrinho - AJUSTAR SELETORES PARA SOLETERRA.COM.BR
    // Seletores comuns para itens no carrinho ou resumo do checkout
    const itemSelectors = [
        '.cart-item',        // Genérico
        '.cart__item',       // Shopify
        'tr.cart-row',       // Tabelas
        '.checkout-product-item', // Checkout genérico
        '.product-table tbody tr', // Checkout VTEX
        '.order-summary__section__content .product' // Checkout Shopify
    ];
    let cartItems = [];
    try {
         cartItems = document.querySelectorAll(itemSelectors.join(', '));
    } catch (e) {
         console.error("[Meta Tracking] Erro ao buscar itens do carrinho com seletores:", itemSelectors.join(', '), e);
         return cartData; // Retorna dados vazios se seletores falharem
    }


    console.log(`[Meta Tracking] Itens encontrados (${itemSelectors.join(', ')}): ${cartItems.length}`);

    if (cartItems.length > 0) {
        cartItems.forEach((item, index) => {
            let productId = null;
            let productVariantId = null; // Útil para distinguir variantes
            let productName = `Item ${index + 1}`; // Fallback name
            let quantity = 1; // Fallback quantity
            let itemPrice = 0; // Preço unitário

            // --- Extração de Dados do Item (AJUSTAR SELETORES) ---
            try {
                // 1. ID (Produto/Variante)
                // Priorizar data attributes ou inputs específicos
                let idElement = item.querySelector('[data-variant-id], input[name*="variant_id"], [data-product-id], input[name*="product_id"], input[name*="id"]');
                if (idElement) {
                     productVariantId = idElement.getAttribute('data-variant-id') || (idElement.tagName === 'INPUT' && idElement.name && idElement.name.includes('variant') ? idElement.value : null);
                     productId = idElement.getAttribute('data-product-id') || (idElement.tagName === 'INPUT' ? idElement.value : null); // Pegar value de input
                     // Se pegamos um ID de variante no 'productId' e não havia um específico
                     if (!productVariantId && productId && productId !== item.getAttribute('data-product-id')) {
                          productVariantId = productId;
                          // Tentar pegar o ID do produto pai se possível
                           const productAncestor = item.closest('[data-product-id]');
                           productId = productAncestor ? productAncestor.getAttribute('data-product-id') : productId;
                     }
                     // Usar ID da variante se disponível, senão ID do produto
                     productId = productVariantId || productId;
                } else {
                     // Fallback: Tentar extrair de um link dentro do item
                     const linkElement = item.querySelector('a[href*="/product"], a[href*="/produto"]');
                     if (linkElement) {
                         // Extrai o último segmento numérico da URL como ID (pode ser produto ou variante)
                         const matches = linkElement.href.match(/[/=](\d+)(\?|$)/);
                         if (matches && matches[1]) {
                             productId = matches[1];
                         } else {
                              // Fallback se não houver número: usar o handle
                              productId = linkElement.href.split('/').pop().split('?')[0];
                         }
                     }
                }

                // 2. Nome do Produto
                const nameElement = item.querySelector('.product-name, .product__description__name, .cart-item__name, .product-title, .item-title, strong'); // Adicionado strong como fallback
                if (nameElement && nameElement.textContent.trim()) {
                    productName = nameElement.textContent.trim();
                } else {
                     // Fallback: Tentar alt text de imagem
                     const imgElement = item.querySelector('img[alt]');
                     if (imgElement && imgElement.alt.trim()) {
                         productName = imgElement.alt.trim();
                     }
                }
                 // Remover "Show" se aparecer
                 if (productName.toLowerCase() === 'show') productName = `Item ${index + 1}`;


                // 3. Quantidade
                const quantityElement = item.querySelector('input[name*="quantity"], input[type="number"], .quantity__input, .cart-item__quantity-input, [data-item-quantity]');
                if (quantityElement) {
                    quantity = parseInt(quantityElement.value || quantityElement.textContent.trim(), 10) || 1;
                } else {
                     // Fallback: Procurar por texto indicando quantidade (ex: "Qty: 2", "2x")
                     const qtyTextElement = item.querySelector('.product-quantity, .cart-item__quantity, .item-qty');
                      if (qtyTextElement) {
                           const qtyMatch = qtyTextElement.textContent.match(/(\d+)/);
                           if (qtyMatch && qtyMatch[1]) {
                               quantity = parseInt(qtyMatch[1], 10) || 1;
                           }
                      } else {
                           quantity = 1; // Default se nada for encontrado
                      }
                }
                 // Garantir que quantidade seja no mínimo 1
                 if (quantity < 1) quantity = 1;


                // 4. Preço Unitário
                 // Tentar do resumo do pedido no checkout primeiro (geralmente mostra preço total do item)
                 if (isCheckout) {
                       const linePriceElement = item.querySelector('.product__price .order-summary__emphasis, .product-price, .line-item-total');
                        if (linePriceElement) {
                             let priceText = linePriceElement.textContent.trim().replace(/[^0-9,.]/g, '');
                             if (priceText.includes(',') && priceText.includes('.')) { priceText = priceText.replace('.', '').replace(',', '.'); }
                             else { priceText = priceText.replace(',', '.'); }
                             const linePrice = parseFloat(priceText) || 0;
                             if (linePrice > 0 && quantity > 0) {
                                 itemPrice = linePrice / quantity; // Calcular preço unitário
                             }
                        }
                 }
                 // Se não encontrou no checkout ou não está no checkout, ou preço zero, procurar preço unitário
                 if (itemPrice <= 0) {
                     const priceElement = item.querySelector('.price, .product-price, .cart-item__price, [data-item-price]');
                     if (priceElement) {
                         let priceText = priceElement.getAttribute('data-item-price') || priceElement.textContent.trim().replace(/[^0-9,.]/g, '');
                         if (priceText.includes(',') && priceText.includes('.')) { priceText = priceText.replace('.', '').replace(',', '.'); }
                         else { priceText = priceText.replace(',', '.'); }
                         itemPrice = parseFloat(priceText) || 0;
                     }
                 }

                 // Se ainda não tem preço, tentar um seletor mais genérico dentro do item
                  if (itemPrice <= 0) {
                     const genericPriceElement = item.querySelector('[class*="price"], [class*="preco"], [class*="valor"]');
                     if (genericPriceElement) {
                         let priceText = genericPriceElement.textContent.trim().replace(/[^0-9,.]/g, '');
                          if (priceText.includes(',') && priceText.includes('.')) { priceText = priceText.replace('.', '').replace(',', '.'); }
                          else { priceText = priceText.replace(',', '.'); }
                          // Verificar se é um preço de linha (alto) e dividir pela quantidade
                          const potentialLinePrice = parseFloat(priceText);
                          if (potentialLinePrice > 0 && quantity > 0 && potentialLinePrice / quantity > 1) { // Evita dividir centavos
                               itemPrice = potentialLinePrice / quantity;
                          } else if (potentialLinePrice > 0) {
                               itemPrice = potentialLinePrice;
                          }
                     }
                  }

            } catch (error) {
                console.error(`[Meta Tracking] Erro ao extrair dados do item ${index}:`, error, item);
                // Continuar para o próximo item mesmo se um falhar
                return; // Pula para o próximo item no forEach
            }
            // --- Fim da Extração ---

            if (productId && quantity > 0) {
                const currentItemId = String(productId);
                cartData.content_ids.push(currentItemId);
                cartData.contents.push({
                    id: currentItemId,
                    quantity: quantity,
                    item_price: parseFloat(itemPrice.toFixed(2)) // Preço unitário formatado
                });
                totalValue += itemPrice * quantity;
                itemCount += quantity;

                 console.log(`[Meta Tracking] Item Carrinho ${index}: ID=${currentItemId}, Nome=${productName}, Qtd=${quantity}, PreçoUnit=${itemPrice.toFixed(2)}`);
            } else {
                 console.warn(`[Meta Tracking] Item Carrinho ${index}: Falha ao extrair ID ou Quantidade.`, {itemElement: item});
            }
        });

        cartData.value = parseFloat(totalValue.toFixed(2));
        cartData.num_items = itemCount;

        // Tentar obter a moeda do total do carrinho se possível - AJUSTAR
        const totalElement = document.querySelector('.cart-total__price, .order-total-price, #total-price, .summary-total');
        if (totalElement && totalElement.textContent.includes('R$')) {
            cartData.currency = 'BRL';
        } else {
             // Tentar encontrar em algum item
             const priceTextSample = document.querySelector('.price, .product-price, .cart-item__price');
              if (priceTextSample && priceTextSample.textContent.includes('R$')) {
                   cartData.currency = 'BRL';
              } else {
                   cartData.currency = 'BRL'; // Default
              }
        }

         // Pode ser necessário ajustar o valor total se ele estiver disponível diretamente no DOM
         if (totalElement) {
              let totalText = totalElement.textContent.trim().replace(/[^0-9,.]/g, '');
               if (totalText.includes(',') && totalText.includes('.')) { totalText = totalText.replace('.', '').replace(',', '.'); }
               else { totalText = totalText.replace(',', '.'); }
               const domTotalValue = parseFloat(totalText);
               if (domTotalValue && Math.abs(domTotalValue - cartData.value) > 0.01) { // Comparar com alguma margem
                   console.warn(`[Meta Tracking] Total calculado (${cartData.value}) diferente do total DOM (${domTotalValue}). Usando total do DOM.`);
                   cartData.value = domTotalValue;
               }
         }

    } else {
        console.warn('[Meta Tracking] Nenhum item encontrado no carrinho/checkout com os seletores atuais.');
         // Tentar obter o total diretamente se os itens não foram encontrados
         const totalElement = document.querySelector('.cart-total__price, .order-total-price, #total-price, .summary-total');
          if (totalElement) {
              let totalText = totalElement.textContent.trim().replace(/[^0-9,.]/g, '');
               if (totalText.includes(',') && totalText.includes('.')) { totalText = totalText.replace('.', '').replace(',', '.'); }
               else { totalText = totalText.replace(',', '.'); }
               cartData.value = parseFloat(totalText) || 0;
                if (totalElement.textContent.includes('R$')) cartData.currency = 'BRL';
          }
    }

     // Limpar dados vazios
     Object.keys(cartData).forEach(key => {
         if (key === 'value' && cartData[key] === 0 && cartData.num_items > 0) return; // Manter valor 0 se houver itens
         if (key === 'num_items' && cartData[key] === 0) return; // Manter num_items 0
         if (cartData[key] == null || cartData[key] === '' || (Array.isArray(cartData[key]) && cartData[key].length === 0)) {
             delete cartData[key];
         }
     });

    console.log('[Meta Tracking] Dados Finais extractCartData:', cartData);
    return cartData;
}
})(); 