/**
 * Meta Pixel Tracker - Similar ao TracLead mas com API própria
 * 
 * Este script detecta automaticamente o tipo de página e envia eventos equivalentes aos da TracLead
 * Incluindo Advanced Matching e parâmetros adicionais
 */

(function() {
  // URL da API de rastreamento
  const API_URL = 'https://rastreamento-meta.onrender.com/track';
  
  // Função para obter cookies
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  }

  // Cria ou recupera ID externo para o usuário
  function getExternalId() {
    let externalId = localStorage.getItem('meta_tracking_external_id');
    if (!externalId) {
      externalId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('meta_tracking_external_id', externalId);
    }
    return externalId;
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
    
    if (path.includes('/product') || path.includes('/produtos')) {
      return {
        type: 'product',
        eventName: 'ViewContent',
        data: getProductDetails()
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
      return {
        type: 'collection',
        eventName: 'ViewCategory',
        data: {
          contentName: 'Category Page',
          contentType: 'category'
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
    
    if (path.includes('/checkout')) {
      return {
        type: 'checkout',
        eventName: 'StartCheckout',
        data: {
          contentName: 'Checkout',
          contentType: 'checkout'
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

  // Enviar evento para a API
  async function sendEvent(eventName, customData = {}) {
    try {
      // Dados básicos do evento
      const eventData = {
        eventName: eventName,
        userData: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          // Obter cookies do Facebook se disponíveis
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc'),
          // Usar ID externo persistente para o usuário
          userId: getExternalId(),
          referrer: document.referrer
        },
        customData: {
          ...customData,
          // Adicionar a URL atual
          sourceUrl: window.location.href,
          referrer: document.referrer
        }
      };

      // Enviar para a API
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

      console.log(`Evento ${eventName} enviado com sucesso`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar evento:', error);
      return null;
    }
  }

  // Função principal - detecta a página e envia os eventos
  function init() {
    // Sempre enviar PageView
    sendEvent('PageView');

    // Detectar o tipo de página e enviar evento específico
    const pageInfo = detectPageType();
    if (pageInfo.type !== 'other') {
      // Aguardar um pouco para enviar o segundo evento (igual ao TracLead)
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
})(); 