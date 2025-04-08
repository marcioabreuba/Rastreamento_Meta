/**
 * Meta Pixel Tracker - Similar ao TracLead mas com API própria
 * 
 * Este script detecta automaticamente o tipo de página e envia eventos equivalentes aos da TracLead
 * Incluindo Advanced Matching e parâmetros adicionais
 * 
 * Versão 1.3 - Suporte a domínios cruzados para checkout e eventos adicionais
 */

(function() {
  // URL da API de rastreamento
  const API_URL = 'https://rastreamento-meta.onrender.com/track';
  
  // ID do seu pixel do Facebook
  const PIXEL_ID = '1163339595278098';
  
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
    scroll_50: false
  };
  
  // Função para obter parâmetros da URL
  function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
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
    
    // NÃO inicializar o pixel imediatamente - vamos fazer isso em cada evento
    console.log('Facebook Pixel script carregado para ID:', PIXEL_ID);
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
        // Procurar por input hidden ou data attributes com ID do produto
        const idElement = document.querySelector('input[name="product_id"], [data-product-id], #product-id, [data-product-handle], [data-variant-id], .product-single__variants option[selected]');
        if (idElement) {
          productId = idElement.value || idElement.getAttribute('data-product-id') || 
                    idElement.getAttribute('data-variant-id') || idElement.getAttribute('data-product-handle') ||
                    idElement.id === 'product-id' ? idElement.textContent.trim() : null;
        }

        // Procurar por variantes do Shopify que frequentemente contêm o ID do produto
        const variantElement = document.querySelector('[name="id"], [data-variant-id], [data-product-variant-id], [data-product-id], select.product-form__variants option[selected]');
        if (variantElement) {
          const variantId = variantElement.value || variantElement.getAttribute('data-variant-id') || 
                          variantElement.getAttribute('data-product-variant-id') || 
                          variantElement.getAttribute('data-product-id');
          if (variantId) {
            productId = variantId;
          }
        }

        // Verificar IDs específicos de Shopify em URLs
        const shopifyProductRegex = /\/products\/[^\/]+\/(\d+)/;
        const shopifyMatch = window.location.href.match(shopifyProductRegex);
        if (shopifyMatch && shopifyMatch[1]) {
          productId = shopifyMatch[1];
        }
        
        // Verificar elementos de formulário de adição ao carrinho que geralmente têm o ID do produto
        const addToCartForm = document.querySelector('form[action*="/cart/add"]');
        if (addToCartForm) {
          const idInput = addToCartForm.querySelector('input[name="id"]');
          if (idInput && idInput.value) {
            productId = idInput.value;
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

        // Para Soleterra, procurar ID especificamente nas meta tags
        if (!productId) {
          const metaTags = document.querySelectorAll('meta');
          metaTags.forEach(tag => {
            const property = tag.getAttribute('property') || tag.getAttribute('name');
            const content = tag.getAttribute('content');
            
            if ((property === 'product:retailer_item_id' || 
                property === 'og:sku' || 
                property === 'product:sku') && content) {
              productId = content;
            }
          });
        }
        
        // Verificar dados específicos da Soleterra inseridos no HTML
        if (!productId) {
          const soleId = document.querySelector('[data-soleterra-product-id]');
          if (soleId) {
            productId = soleId.getAttribute('data-soleterra-product-id');
          }
        }
      }
      
      // 8. Procurar nas tags meta do OpenGraph (og:)
      if (!productId) {
        const ogProductIdMeta = document.querySelector('meta[property="og:product_id"], meta[property="product:id"], meta[property="product:sku"], meta[property="og:sku"]');
        if (ogProductIdMeta) {
          productId = ogProductIdMeta.getAttribute('content');
        }
      }
      
      // 9. Procurar tags HTML específicas que contêm identificadores de produtos
      if (!productId) {
        // Verificar data-product-id em vários elementos
        const productElements = document.querySelectorAll('[data-product-id], [data-product], #product-id, [data-item-id], [data-pid]');
        for (const element of productElements) {
          const id = element.getAttribute('data-product-id') || 
                    element.getAttribute('data-product') || 
                    element.getAttribute('data-item-id') || 
                    element.getAttribute('data-pid') || 
                    element.id === 'product-id' ? element.textContent.trim() : null;
          if (id && /^\d+$/.test(id)) {
            productId = id;
            break;
          }
        }
      }
      
      // 10. Extrair ID de links de compartilhamento ou canônicos
      if (!productId) {
        const shareLinks = document.querySelectorAll('a[href*="share"], link[rel="canonical"]');
        for (const link of shareLinks) {
          const href = link.getAttribute('href');
          if (href) {
            const matches = href.match(/\d{5,}/); // IDs geralmente têm pelo menos 5 dígitos
            if (matches && matches[0]) {
              productId = matches[0];
              break;
            }
          }
        }
      }
      
      // 11. Como último recurso, usar o último segmento da URL como ID se for numérico
      if (!productId && /^\d+$/.test(lastSegment)) {
        productId = lastSegment;
      }
      
      // Garantir que temos pelo menos uma categoria padrão
      if (productCategories.length === 0) {
        // Verificar pelo nome do produto
        if (productTitle) {
          const productTitleLower = productTitle.toLowerCase();
          if (productTitleLower.includes('bolsa')) {
            productCategories.push('bolsa');
          } else if (productTitleLower.includes('colar')) {
            productCategories.push('acessório');
          } else {
            productCategories.push('product');
          }
        } else {
          productCategories.push('product');
        }
      }

      // Extrair o preço do produto
      const price = extractPrice() || 0;
      
      return {
        type: 'product',
        eventName: 'ViewContent',
        data: {
          contentName: productTitle || document.title.split('|')[0].trim(),
          contentType: 'product_group',
          contentCategory: productCategories,
          contentIds: productId ? [productId] : null,
          contents: productId ? [{ 
            id: productId, 
            item_price: price,
            quantity: 1 
          }] : null,
          value: price
        }
      };
    }
    
    if (path.includes('/cart') || path.includes('/carrinho')) {
      return {
        type: 'cart', 
        eventName: 'ViewCart',
        data: {
          contentName: 'Shopping Cart',
          contentType: 'cart'
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
  
  // Função para hash de dados sensíveis (SHA-256) para o Facebook
  function hashData(data) {
    // Se não tivermos o dado ou estiver vazio, retornar null
    if (!data) return null;
    
    // Se o browser tiver suporte para crypto.subtle
    if (window.crypto && window.crypto.subtle) {
      try {
        // Converter string para ArrayBuffer
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        // Criar um hash SHA-256
        const hashBuffer = crypto.subtle.digest('SHA-256', dataBuffer);
        
        // Converter o hash para string hexadecimal
        return hashBuffer.then(hash => {
          const hashArray = Array.from(new Uint8Array(hash));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          return hashHex;
        });
      } catch (e) {
        console.error('Erro ao calcular hash:', e);
        return hashString(data); // Fallback para hashString
      }
    }
    
    // Fallback se crypto.subtle não estiver disponível
    return hashString(data);
  }
  
  // Tenta obter dados do usuário de várias fontes
  function getUserData() {
    // Objeto para armazenar os dados do usuário
    const userData = {};
    
    // Tentar obter dados de scripts globais ou objetos de dados
    try {
      // 1. Verificar se há variáveis globais com dados do usuário (comum em e-commerces)
      if (window.userEmail) userData.email = window.userEmail;
      if (window.userName) userData.firstName = window.userName;
      if (window.userPhone) userData.phone = window.userPhone;
      
      // 2. Buscar em meta tags específicas
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name');
        const content = tag.getAttribute('content');
        
        if (name === 'user:email') userData.email = content;
        if (name === 'user:phone') userData.phone = content;
        if (name === 'user:first_name') userData.firstName = content;
        if (name === 'user:last_name') userData.lastName = content;
        if (name === 'user:city') userData.city = content;
        if (name === 'user:state') userData.state = content;
        if (name === 'user:country') userData.country = content;
      });
      
      // 3. Verificar dados em elementos com data attributes
      const userDataElement = document.querySelector('[data-user]');
      if (userDataElement) {
        try {
          const dataUser = JSON.parse(userDataElement.dataset.user);
          if (dataUser.email) userData.email = dataUser.email;
          if (dataUser.phone) userData.phone = dataUser.phone;
          if (dataUser.firstName) userData.firstName = dataUser.firstName;
          if (dataUser.lastName) userData.lastName = dataUser.lastName;
          if (dataUser.city) userData.city = dataUser.city;
          if (dataUser.state) userData.state = dataUser.state;
          if (dataUser.country) userData.country = dataUser.country;
        } catch (e) {
          console.error('Erro ao processar dados do usuário:', e);
        }
      }
      
      // 4. Shopify específico (se for uma loja Shopify)
      if (window.Shopify && window.Shopify.customer) {
        const customer = window.Shopify.customer;
        if (customer.email) userData.email = customer.email;
        if (customer.firstName) userData.firstName = customer.firstName;
        if (customer.lastName) userData.lastName = customer.lastName;
        if (customer.phone) userData.phone = customer.phone;
        
        // Dados de endereço
        if (customer.defaultAddress) {
          if (customer.defaultAddress.city) userData.city = customer.defaultAddress.city;
          if (customer.defaultAddress.province) userData.state = customer.defaultAddress.province;
          if (customer.defaultAddress.country) userData.country = customer.defaultAddress.country;
          if (customer.defaultAddress.zip) userData.zip = customer.defaultAddress.zip;
        }
      }
    } catch (e) {
      console.error('Erro ao obter dados do usuário:', e);
    }
    
    return userData;
  }

  /**
   * Valida e corrige o formato do FBP
   * @param {string|null} fbp - Valor do FBP a ser validado
   * @returns {string|null} FBP válido ou null
   */
  function validateFbp(fbp) {
    if (!fbp) return null;
    
    // Verificar se já está no formato correto
    if (/^fb\.1\.\d+\.\d+$/.test(fbp)) {
      return fbp;
    }
    
    // Se começar com fb.2, corrigir para fb.1
    if (fbp.startsWith('fb.2.')) {
      return 'fb.1.' + fbp.substring(5);
    }
    
    // Se for um hash ou outro formato, gerar um novo FBP válido
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `fb.1.${timestamp}.${random}`;
  }

  // Enviar evento para o Pixel e para a API
  async function sendEvent(eventName, customData = {}) {
    try {
      // Preparar Advanced Matching nos mesmos formatos que o Pixel Helper reconhece
      const external_id = getExternalId();
      const client_user_agent = hashString(navigator.userAgent);
      
      // Obter cookies do Facebook com suporte a parâmetros de URL
      const fbp_raw = getCookie('_fbp') || getUrlParameter('fbp') || hashString('no_fbp_' + Date.now());
      const fbp = validateFbp(fbp_raw);
      const fbc = getCookie('_fbc') || getUrlParameter('fbc') || null;
      
      // Obter informações adicionais do usuário, se disponíveis
      const userData = getUserData();
      
      // Adicionar parâmetros extras
      const extraParams = {
        app: 'meta-tracking',
        event_time: Math.floor(Date.now() / 1000),
        language: navigator.language || 'pt-BR',
        referrer: document.referrer
      };
      
      // Garantir que todos os parâmetros obrigatórios estão presentes
      const standardizedCustomData = {
        content_category: customData.contentCategory || customData.content_category || 
          (Array.isArray(customData.contentIds) && customData.contentIds.length ? 
            [customData.contentIds[0].split('-')[0]] : 
            // Usar informações do evento para definir uma categoria padrão
            eventName === 'ViewHome' ? 'homepage' : 
            eventName === 'ViewContent' ? 'product' : 
            eventName === 'ViewList' || eventName === 'ViewCategory' ? 'category' : 
            eventName === 'Search' || eventName === 'ViewSearchResults' ? 'search' : 
            eventName === 'AddToCart' ? 'cart' : 
            eventName === 'Purchase' ? 'purchase' : 'general'),
        content_ids: customData.contentIds || customData.content_ids || null,
        content_name: customData.contentName || customData.content_name || null,
        content_type: customData.contentType || customData.content_type || "product_group",
        contents: customData.contents || (customData.contentIds ? [{ id: Array.isArray(customData.contentIds) ? customData.contentIds[0] : customData.contentIds, quantity: customData.numItems || customData.num_items || 1 }] : null),
        currency: customData.currency || 'BRL',
        num_items: customData.numItems || customData.num_items || 1,
        value: customData.value ? Math.round(Number(customData.value)) : 0,
        ...extraParams
      };
      
      // Combinar com outros dados personalizados
      const enhancedCustomData = {
        ...customData,
        ...standardizedCustomData
      };
      
      // Gerar event ID único para este evento
      const eventID = 'meta_tracking_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      
      // Inicializar o pixel com Advanced Matching a cada evento
      // Isso garante que o Pixel Helper capture corretamente os parâmetros
      fbq('init', PIXEL_ID);
      
      // Formato explícito de ud[] que o TracLead usa
      // Isso força o Pixel Helper a exibir os parâmetros corretamente
      const pixelUrl = 'https://www.facebook.com/tr/';
      const baseParams = new URLSearchParams({
        id: PIXEL_ID,
        ev: eventName === 'ViewHome' ? 'ViewHome' : eventName,
        dl: document.location.href,
        rl: document.referrer,
        if: false,
        ts: Date.now(),
        v: '2.9.194',
        r: 'stable',
        eid: eventID
      });
      
      // Adicionar Advanced Matching no formato ud[campo]=valor
      // Parâmetros básicos
      baseParams.append('ud[external_id]', external_id);
      baseParams.append('ud[client_user_agent]', client_user_agent);
      baseParams.append('ud[fbp]', fbp);
      
      // Adicionar FBC se disponível
      if (fbc) {
        baseParams.append('ud[fbc]', fbc);
      }
      
      // Funções para processar e adicionar dados com hash
      const addHashedData = async (name, value) => {
        if (value) {
          try {
            // Se o valor já for uma promessa (de hashData), aguardar
            if (value instanceof Promise) {
              const hashedValue = await value;
              baseParams.append(`ud[${name}]`, hashedValue);
            } else {
              const hashedValue = await hashData(value);
              baseParams.append(`ud[${name}]`, hashedValue);
            }
          } catch (e) {
            console.error(`Erro ao processar ${name}:`, e);
          }
        }
      };
      
      // Adicionar outros parâmetros de Advanced Matching se disponíveis
      if (userData.email) {
        await addHashedData('em', userData.email.toLowerCase().trim());
      }
      
      if (userData.phone) {
        await addHashedData('ph', userData.phone.replace(/\D/g, ''));
      }
      
      if (userData.firstName) {
        await addHashedData('fn', userData.firstName.toLowerCase().trim());
      }
      
      if (userData.lastName) {
        await addHashedData('ln', userData.lastName.toLowerCase().trim());
      }
      
      // Adicionar dados geográficos sem hash
      if (userData.city) {
        baseParams.append('ud[ct]', userData.city);
      }
      
      if (userData.state) {
        baseParams.append('ud[st]', userData.state);
      }
      
      if (userData.country) {
        baseParams.append('ud[country]', userData.country);
      }
      
      if (userData.zip) {
        baseParams.append('ud[zp]', userData.zip);
      }
      
      // Definir mapeamento de nomes para garantir formato correto (camelCase para snake_case)
      const paramMapping = {
        'contentCategory': 'content_category',
        'contentIds': 'content_ids',
        'contentName': 'content_name',
        'contentType': 'content_type',
        'numItems': 'num_items',
        // Manter também os nomes com underscore para não duplicar
        'content_category': 'content_category',
        'content_ids': 'content_ids',
        'content_name': 'content_name',
        'content_type': 'content_type',
        'contents': 'contents',
        'num_items': 'num_items'
      };
      
      // Adicionar os custom data params com nomes padronizados
      Object.entries(enhancedCustomData).forEach(([key, value]) => {
        // Não adicionar dados geográficos do usuário como custom data params
        // para evitar duplicidade, pois já foram adicionados como ud[] acima
        if (key !== 'user_city' && key !== 'user_state' && 
            key !== 'user_country' && key !== 'user_zip') {
          
          // Usar o nome mapeado se existir, senão usar o nome original
          const mappedKey = paramMapping[key] || key;
          
          // Não adicionar parâmetros nulos
          if (value !== null && value !== undefined) {
            // Para arrays e objetos, converter para JSON
            if (typeof value === 'object') {
              baseParams.append(`cd[${mappedKey}]`, JSON.stringify(value));
            } else {
              baseParams.append(`cd[${mappedKey}]`, value);
            }
          }
        }
      });
      
      // Criar e enviar o pixel manualmente usando um image request
      const pixelImg = new Image();
      pixelImg.src = `${pixelUrl}?${baseParams.toString()}`;
      
      // 2. Dados para nossa API
      const eventData = {
        eventName: eventName,
        userData: {
          userAgent: navigator.userAgent,
          language: navigator.language || 'pt-BR',
          // Obter cookies do Facebook se disponíveis
          fbp: fbp,
          fbc: fbc,
          // Usar ID externo persistente para o usuário
          userId: external_id,
          referrer: document.referrer,
          // Adicionar dados adicionais do usuário, se disponíveis
          ...userData
        },
        customData: {
          ...enhancedCustomData,
          // Adicionar a URL atual
          sourceUrl: window.location.href
        }
      };

      // Também enviar para a API backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Erro na resposta: ${response.status}`);
      }

      console.log(`Evento ${eventName} enviado com sucesso (ID: ${eventID})`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar evento:', error);
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
    
    // Event listener para rolagem
    window.addEventListener('scroll', function() {
      const scrollPercentage = getScrollPercentage();
      maxScrollPercentage = Math.max(maxScrollPercentage, scrollPercentage);
      
      // Verificar se atingiu 25% e não foi enviado ainda
      if (maxScrollPercentage >= 25 && !sentEvents.scroll_25) {
        sentEvents.scroll_25 = true;
        sendEvent('Scroll_25', {
          scrollPercentage: 25,
          pageUrl: window.location.href,
          contentName: document.title
        });
      }
      
      // Verificar se atingiu 50% e não foi enviado ainda
      if (maxScrollPercentage >= 50 && !sentEvents.scroll_50) {
        sentEvents.scroll_50 = true;
        sendEvent('Scroll_50', {
          scrollPercentage: 50,
          pageUrl: window.location.href,
          contentName: document.title
        });
      }
    }, { passive: true });
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

  // Função principal - detecta a página e envia os eventos
  function init() {
    // Inicializar o pixel do Facebook
    initFacebookPixel();
    
    // Detectar o tipo de página e enviar eventos baseados no tipo de página
    const pageInfo = detectPageType();
    
    if (pageInfo) {
      // Garantir que contentIds seja sempre um array
      if (!pageInfo.data.contentIds) {
        pageInfo.data.contentIds = [];
      } else if (!Array.isArray(pageInfo.data.contentIds)) {
        pageInfo.data.contentIds = [pageInfo.data.contentIds];
      }
      
      // Garantir que contentCategory seja sempre um array
      if (!pageInfo.data.contentCategory) {
        pageInfo.data.contentCategory = [];
      } else if (!Array.isArray(pageInfo.data.contentCategory)) {
        pageInfo.data.contentCategory = [pageInfo.data.contentCategory];
      }
      
      // Garantir que contents seja sempre um array com objetos válidos
      if (pageInfo.data.contentIds && pageInfo.data.contentIds.length > 0 && 
          (!pageInfo.data.contents || !Array.isArray(pageInfo.data.contents))) {
        // Criar contents a partir de contentIds
        const price = pageInfo.data.value || extractPrice() || 0;
        pageInfo.data.contents = pageInfo.data.contentIds.map(id => ({
          id: id,
          quantity: 1,
          item_price: price
        }));
      }
      
      // Verificar preço se for uma página de produto
      if (pageInfo.type === 'product' && !pageInfo.data.value) {
        pageInfo.data.value = extractPrice() || 0;
      }
      
      // Adicionar rastreamento específico para o Soleterra
      if (window.location.hostname.includes('soleterra.com.br')) {
        // Meta tags específicas do Soleterra para rastreamento
        const soleMetaTags = document.querySelectorAll('meta[property^="product:"]');
        soleMetaTags.forEach(tag => {
          const property = tag.getAttribute('property');
          const content = tag.getAttribute('content');
          
          if (property === 'product:price:amount' && content) {
            pageInfo.data.value = parseFloat(content);
            
            // Atualizar o preço em contents também
            if (pageInfo.data.contents && pageInfo.data.contents.length > 0) {
              pageInfo.data.contents.forEach(item => {
                item.item_price = parseFloat(content);
              });
            }
          }
        });
      }
      
      // Verificar dados necessários para produtos
      if (pageInfo.type === 'product' && (!pageInfo.data.contentIds || pageInfo.data.contentIds.length === 0)) {
        console.warn('Produto sem ID detectado, tentando métodos alternativos de detecção');
        
        // Último recurso: usar o URL como ID
        const pathSegments = window.location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        
        if (lastSegment && lastSegment !== '') {
          pageInfo.data.contentIds = [lastSegment];
          
          const price = pageInfo.data.value || extractPrice() || 0;
          pageInfo.data.contents = [{ 
            id: lastSegment, 
            quantity: 1,
            item_price: price
          }];
        }
      }
      
      // Enviar evento para o Pixel e API apenas se tivermos dados válidos
      if (pageInfo.eventName) {
        // Para eventos de produto, garantir que temos pelo menos um ID
        if (pageInfo.type === 'product' && 
            (!pageInfo.data.contentIds || pageInfo.data.contentIds.length === 0)) {
          console.warn('Não foi possível determinar o ID do produto. Enviando evento PageView genérico.');
          sendEvent('PageView', {
            contentName: document.title,
            contentType: 'page'
          });
        } else {
          sendEvent(pageInfo.eventName, pageInfo.data);
          console.log(`Meta Pixel Tracker: Evento ${pageInfo.eventName} enviado para página do tipo ${pageInfo.type}`);
        }
      } else {
        // Fallback para PageView se não conseguir determinar o evento
        sendEvent('PageView', {
          contentName: document.title,
          contentType: 'page'
        });
        console.log('Meta Pixel Tracker: Evento PageView genérico enviado (fallback)');
      }
      
      // Configurar rastreamento adicional para todas as páginas
      setupScrollTracking();
      setupTimerTracking();
    } else {
      // Se não detectou um tipo específico, enviar PageView genérico
      sendEvent('PageView', {
        contentName: document.title,
        contentType: 'page'
      });
      
      console.log('Meta Pixel Tracker: Evento PageView genérico enviado');
    }
    
    // Configurar rastreamento de produtos em listas/coleções
    setupProductListTracking();
  }

  // Rastreamento de cliques em produtos em listas/coleções
  function setupProductListTracking() {
    // Encontrar elementos de produtos em listas
    const productLinks = document.querySelectorAll('a[href*="/product/"], a[href*="/produto/"], [data-product-id] a, .product-card a, .product-item a');
    
    productLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        // Buscar ID e informações do produto
        let productId = this.getAttribute('data-product-id') || 
                       this.closest('[data-product-id]')?.getAttribute('data-product-id');
        
        if (!productId) {
          // Tentar extrair da URL
          const href = this.getAttribute('href');
          if (href) {
            const pathParts = href.split('/');
            const lastSegment = pathParts[pathParts.length - 1];
            const idMatch = lastSegment.match(/\d+$/);
            if (idMatch) {
              productId = idMatch[0];
            } else if (lastSegment && lastSegment !== '') {
              productId = lastSegment;
            }
          }
        }
        
        if (productId) {
          // Encontrar nome e preço, se disponíveis
          let productName = '';
          let productPrice = 0;
          
          // Procurar texto ou elementos próximos para o nome
          const nameEl = this.querySelector('.product-title, .product-name, h3, h4') || 
                        this.closest('.product-card, .product-item')?.querySelector('.product-title, .product-name, h3, h4');
          
          if (nameEl) {
            productName = nameEl.textContent.trim();
          }
          
          // Procurar elemento de preço
          const priceEl = this.querySelector('.price, [data-product-price]') || 
                         this.closest('.product-card, .product-item')?.querySelector('.price, [data-product-price]');
          
          if (priceEl) {
            const priceText = priceEl.textContent.trim().replace(/[^0-9,.]/g, '');
            productPrice = parseFloat(priceText.replace(',', '.'));
          }
          
          // Enviar evento de clique em produto
          sendEvent('ViewContent', {
            contentIds: [productId],
            contentName: productName || 'Produto',
            contentType: 'product',
            value: productPrice,
            contents: [{ id: productId, quantity: 1, item_price: productPrice }]
          });
        }
      });
    });
  }

  // Inicializar quando o DOM estiver carregado
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
      // Método 1: Tentar obter do JSON-LD (Schema.org)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent);
          
          // Verificar diferentes estruturas de JSON-LD
          if (data) {
            // Caso 1: Array de objetos JSON-LD
            if (Array.isArray(data)) {
              for (const item of data) {
                // Verificar produto com ofertas
                if ((item['@type'] === 'Product' || item.type === 'Product') && item.offers) {
                  if (typeof item.offers.price === 'number' || typeof item.offers.price === 'string') {
                    return parseFloat(item.offers.price);
                  }
                  // Verificar array de ofertas
                  if (Array.isArray(item.offers) && item.offers.length > 0) {
                    if (typeof item.offers[0].price === 'number' || typeof item.offers[0].price === 'string') {
                      return parseFloat(item.offers[0].price);
                    }
                    if (item.offers[0].lowPrice) {
                      return parseFloat(item.offers[0].lowPrice);
                    }
                  }
                  // Verificar preço formatado em priceSpecification
                  if (item.offers.priceSpecification && 
                     (typeof item.offers.priceSpecification.price === 'number' || 
                      typeof item.offers.priceSpecification.price === 'string')) {
                    return parseFloat(item.offers.priceSpecification.price);
                  }
                }
                
                // Verificar apenas ofertas
                if ((item['@type'] === 'Offer' || item.type === 'Offer') && 
                    (typeof item.price === 'number' || typeof item.price === 'string')) {
                  return parseFloat(item.price);
                }
              }
            } 
            // Caso 2: Objeto único com produto
            else if (data['@type'] === 'Product' || data.type === 'Product') {
              // Verificar offer direta
              if (data.offers) {
                if (typeof data.offers.price === 'number' || typeof data.offers.price === 'string') {
                  return parseFloat(data.offers.price);
                }
                // Verificar array de ofertas
                if (Array.isArray(data.offers) && data.offers.length > 0) {
                  if (typeof data.offers[0].price === 'number' || typeof data.offers[0].price === 'string') {
                    return parseFloat(data.offers[0].price);
                  }
                  if (data.offers[0].lowPrice) {
                    return parseFloat(data.offers[0].lowPrice);
                  }
                }
                // Verificar priceSpecification
                if (data.offers.priceSpecification && 
                   (typeof data.offers.priceSpecification.price === 'number' || 
                    typeof data.offers.priceSpecification.price === 'string')) {
                  return parseFloat(data.offers.priceSpecification.price);
                }
              }
            }
            // Caso 3: Objeto único com oferta
            else if (data['@type'] === 'Offer' || data.type === 'Offer') {
              if (typeof data.price === 'number' || typeof data.price === 'string') {
                return parseFloat(data.price);
              }
              // Verificar priceSpecification
              if (data.priceSpecification && 
                 (typeof data.priceSpecification.price === 'number' || 
                  typeof data.priceSpecification.price === 'string')) {
                return parseFloat(data.priceSpecification.price);
              }
            }
            // Caso 4: Verificar propriedade graph para AggregateOffer
            else if (data['@graph']) {
              for (const item of data['@graph']) {
                if ((item['@type'] === 'Product' || item.type === 'Product') && item.offers) {
                  if (typeof item.offers.price === 'number' || typeof item.offers.price === 'string') {
                    return parseFloat(item.offers.price);
                  }
                  // Verificar array de ofertas
                  if (Array.isArray(item.offers) && item.offers.length > 0) {
                    if (typeof item.offers[0].price === 'number' || typeof item.offers[0].price === 'string') {
                      return parseFloat(item.offers[0].price);
                    }
                    if (item.offers[0].lowPrice) {
                      return parseFloat(item.offers[0].lowPrice);
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao analisar JSON-LD:', e);
        }
      }

      // Método 2: Procurar por atributos de microdata (itemprop="price")
      const priceElements = document.querySelectorAll('[itemprop="price"], [property="product:price:amount"], [property="og:price:amount"], [data-price], [data-product-price]');
      if (priceElements.length > 0) {
        for (const element of priceElements) {
          const price = element.getAttribute('content') || element.getAttribute('value') || element.textContent;
          if (price) {
            // Limpar e converter para número
            const cleanPrice = price.replace(/[^\d,.]/g, '').replace(',', '.');
            const numericPrice = parseFloat(cleanPrice);
            if (!isNaN(numericPrice) && numericPrice > 0) {
              return numericPrice;
            }
          }
        }
      }

      // Método 3: Procurar meta tags específicas
      const metaTags = [
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        'meta[name="twitter:data1"]',
        'meta[property="product:sale_price:amount"]',
        'meta[property="og:price"]',
        'meta[name="product:price"]',
        'meta[name="price"]'
      ];
      
      for (const selector of metaTags) {
        const metaTag = document.querySelector(selector);
        if (metaTag) {
          const price = metaTag.getAttribute('content');
          if (price) {
            const cleanPrice = price.replace(/[^\d,.]/g, '').replace(',', '.');
            const numericPrice = parseFloat(cleanPrice);
            if (!isNaN(numericPrice) && numericPrice > 0) {
              return numericPrice;
            }
          }
        }
      }

      // Método 4: Procurar por seletores comuns em diferentes plataformas de e-commerce
      const commonSelectors = [
        // Shopify
        '.price .money', '.price__current', '[data-price]', '.product__price', '.product-single__price',
        // WooCommerce
        '.woocommerce-Price-amount', '.price .amount', 'p.price', '.summary .price', 'div.product span.price',
        // Magento
        '.price-box .price', '.product-info-price .price', '.special-price .price', '.normal-price .price',
        // OpenCart
        '#product .price', '.product-price', '#content .price',
        // PrestaShop
        '.current-price', '.product-price', '#our_price_display', '.content_price .price',
        // VTEX
        '.skuBestPrice', '.productPrice', '.valor-por', '.precoPor', '.price-best-price',
        // Seletores genéricos
        '.product-price', '.price-current', '.sale-price', '.actual-price',
        '.current_price', '.price-item--regular', '.product-info__price', '.product_price',
        // Soleterra e outros sites específicos
        '.product-price .price', '.productPrice', '.product-detail-price', '.valor-producto',
        '.price-item', '.regular-price', '.special-price', '.price-now', '.price-new',
        // Mercado Livre e outros marketplaces
        '.ui-pdp-price__second-line .andes-money-amount', 
        '.ui-pdp-price__part .andes-money-amount__fraction',
        '.productInfo-price', '.prd-price-new'
      ];
      
      for (const selector of commonSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          for (const element of elements) {
            // Evitar preços riscados/antigos verificando se não tem linha em cima
            const style = window.getComputedStyle(element);
            if (style.textDecoration.includes('line-through')) {
              continue;
            }
            
            const priceText = element.textContent.trim();
            if (priceText) {
              // Limpar e converter para número
              const cleanPrice = priceText.replace(/[^\d,.]/g, '').replace(',', '.');
              const numericPrice = parseFloat(cleanPrice);
              if (!isNaN(numericPrice) && numericPrice > 0) {
                return numericPrice;
              }
            }
          }
        }
      }

      // Método 5: Verificar inputs escondidos (comum em formulários de carrinho)
      const priceInputs = document.querySelectorAll('input[name*="price"], input[id*="price"], input[data-price], input[class*="price"], [name="product-price"], [data-product-price]');
      for (const input of priceInputs) {
        const price = input.value;
        if (price) {
          const cleanPrice = price.replace(/[^\d,.]/g, '').replace(',', '.');
          const numericPrice = parseFloat(cleanPrice);
          if (!isNaN(numericPrice) && numericPrice > 0) {
            return numericPrice;
          }
        }
      }

      // Método 6: Verificar variáveis globais (comum em Shopify e outras plataformas)
      if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
        const shopifyPrice = window.ShopifyAnalytics.meta.product.price / 100; // Shopify armazena em centavos
        return shopifyPrice;
      }
      
      // Verificar variável do WooCommerce
      if (window.wc_product_price) {
        return parseFloat(window.wc_product_price);
      }
      
      // Verificar dados do VTEX
      if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.product) {
        const vtexProduct = window.__PRELOADED_STATE__.product;
        if (vtexProduct.items && vtexProduct.items[0] && vtexProduct.items[0].sellers) {
          const seller = vtexProduct.items[0].sellers[0];
          if (seller.commertialOffer && seller.commertialOffer.Price) {
            return seller.commertialOffer.Price;
          }
        }
      }

      // Método 7: Buscar no texto da página padrões de preço
      // Procurar por padrões como "R$ 99,90" na página
      const allText = document.body.innerText;
      const priceMatches = allText.match(/R\$\s?(\d{1,3}(?:\.\d{3})*|\d+),\d{2}/g);
      if (priceMatches && priceMatches.length > 0) {
        // Pegar o primeiro preço encontrado
        const firstPriceMatch = priceMatches[0];
        const cleanPrice = firstPriceMatch.replace(/[^\d,.]/g, '').replace(',', '.');
        const numericPrice = parseFloat(cleanPrice);
        if (!isNaN(numericPrice) && numericPrice > 0) {
          return numericPrice;
        }
      }

      // Método 8: Procurar atributos de data específicos
      const dataAttrs = ['data-price', 'data-product-price', 'data-regular-price', 'data-sale-price', 'data-value'];
      for (const attr of dataAttrs) {
        const elements = document.querySelectorAll(`[${attr}]`);
        for (const el of elements) {
          const price = el.getAttribute(attr);
          if (price) {
            const cleanPrice = price.replace(/[^\d,.]/g, '').replace(',', '.');
            const numericPrice = parseFloat(cleanPrice);
            if (!isNaN(numericPrice) && numericPrice > 0) {
              return numericPrice;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Erro ao extrair preço:', error);
      return null;
    }
  }
})(); 