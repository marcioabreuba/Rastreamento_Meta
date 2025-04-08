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
                // Tentar encontrar e extrair objeto de carrinho JSON
                const cartMatch = content.match(/\{[^{]*"items"[\s\S]*?\}/);
                if (cartMatch) {
                  const cartData = JSON.parse(cartMatch[0]);
                  if (cartData.items && Array.isArray(cartData.items)) {
                    return processCartItems(cartData.items);
                  }
                }
                
                // Tentar extrair do objeto window.cart
                const windowCartMatch = content.match(/window\.cart\s*=\s*(\{[\s\S]*?\});/);
                if (windowCartMatch) {
                  const cartData = JSON.parse(windowCartMatch[1]);
                  if (cartData.items && Array.isArray(cartData.items)) {
                    return processCartItems(cartData.items);
                  }
                }
              } catch (e) {
                console.error('Erro ao processar script de carrinho:', e);
              }
            }
          }
          
          // 2. Se ainda não encontrou, procurar elementos DOM de carrinho
          const cartItemElements = document.querySelectorAll('.cart-item, .cart__item, [data-cart-item], [id*="CartItem"], .line-item, [data-line-item]');
          if (cartItemElements.length > 0) {
            const items = [];
            cartItemElements.forEach(item => {
              try {
                const itemId = item.getAttribute('data-product-id') || 
                              item.getAttribute('data-variant-id') || 
                              item.getAttribute('data-item-id') || 
                              item.getAttribute('id')?.match(/\d+/)?.[0];
                              
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
                    price: price || 0
                  });
                }
              } catch (e) {
                console.error('Erro ao processar item do carrinho:', e);
              }
            });
            
            if (items.length > 0) {
              return processCartItems(items);
            }
          }
          
          // 3. Se ainda não encontrou, tentar obter do HTML total da página
          const bodyHTML = document.body.innerHTML;
          
          // 3.1 Procurar padrões comuns que indicam valores de carrinho
          // Para Shopify e outros sistemas de carrinho populares
          const totalMatch = bodyHTML.match(/total[\s:"']*R?\$?\s*([\d.,]+)/i) || 
                            bodyHTML.match(/cart[\s-]*total[\s:"']*R?\$?\s*([\d.,]+)/i) ||
                            bodyHTML.match(/subtotal[\s:"']*R?\$?\s*([\d.,]+)/i);
          
          if (totalMatch && totalMatch[1]) {
            cartValue = parseFloat(totalMatch[1].replace(',', '.'));
          }
          
          // 3.2 Procurar padrões que indiquem quantidades
          const itemCountMatch = bodyHTML.match(/(\d+)\s*ite(?:m|ns)/i) || 
                               bodyHTML.match(/cart[\s-]*count[^\d]*(\d+)/i);
          
          if (itemCountMatch && itemCountMatch[1]) {
            numItems = parseInt(itemCountMatch[1]);
          }
          
          // 3.3 Procurar IDs de produtos no HTML (último recurso)
          const productIdMatches = bodyHTML.match(/product_id[=:"']+(\d+)/ig) || 
                                  bodyHTML.match(/variant_id[=:"']+(\d+)/ig);
          
          if (productIdMatches) {
            const uniqueIds = new Set();
            productIdMatches.forEach(match => {
              const id = match.match(/\d+/)[0];
              uniqueIds.add(id);
            });
            
            cartItems = Array.from(uniqueIds).map(id => ({ id, quantity: 1 }));
          }
          
          // 3.4 Verificar categorias frequentes no HTML
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
            categories: cartCategories.length > 0 ? cartCategories : ['cart']
          };
        } catch (e) {
          console.error('Erro ao extrair dados do carrinho:', e);
          return { items: [], total: 0, quantity: 0, categories: ['cart'] };
        }
      }
      
      // Função para processar os itens do carrinho
      function processCartItems(items) {
        try {
          const processedItems = [];
          let total = 0;
          let quantity = 0;
          const categories = new Set();
          
          items.forEach(item => {
            const id = item.id || item.product_id || item.variant_id || item.sku || '';
            const qty = item.quantity || 1;
            let price = item.price || item.line_price || 0;
            
            // Se o preço for em centavos (comum em APIs), converter para reais
            if (price > 1000 && !item.price_includes_taxes) {
              price = price / 100;
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
            if (item.title || item.product_title) {
              const title = (item.title || item.product_title).toLowerCase();
              const knownCategories = ['palha', 'croche', 'crochê', 'couro', 'festa', 'bolsa'];
              for (const cat of knownCategories) {
                if (title.includes(cat)) {
                  categories.add(cat);
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
          
          if (categories.size === 0) {
            categories.add('cart');
          }
          
          return {
            items: processedItems,
            total,
            quantity,
            categories: Array.from(categories)
          };
        } catch (e) {
          console.error('Erro ao processar itens do carrinho:', e);
          return {
            items: [],
            total: 0,
            quantity: 0,
            categories: ['cart']
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
          contentName: 'Shopping Cart',
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
    
    // Configurar rastreamento de rolagem
    setupScrollTracking();
    
    // Configurar timer de 1 minuto
    setupTimerTracking();
    
    // Sempre enviar PageView
    sendEvent('PageView');

    // Detectar o tipo de página e enviar evento específico
    const pageInfo = detectPageType();
    if (pageInfo.type !== 'other') {
      // Aguardar um pouco para enviar o segundo evento
      setTimeout(() => {
        sendEvent(pageInfo.eventName, pageInfo.data);
      }, 500);
    }
  }

  // Iniciar após o carregamento da página
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
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
})(); 