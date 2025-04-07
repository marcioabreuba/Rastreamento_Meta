/**
 * Meta Pixel Tracker - Similar ao TracLead mas com API própria
 * 
 * Este script detecta automaticamente o tipo de página e envia eventos equivalentes aos da TracLead
 * Incluindo Advanced Matching e parâmetros adicionais
 */

(function() {
  // URL da API de rastreamento
  const API_URL = 'https://rastreamento-meta.onrender.com/track';
  
  // ID do seu pixel do Facebook
  const PIXEL_ID = '1163339595278098';
  
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

  // Enviar evento para o Pixel e para a API
  async function sendEvent(eventName, customData = {}) {
    try {
      // Preparar Advanced Matching nos mesmos formatos que o Pixel Helper reconhece
      const external_id = getExternalId();
      const client_user_agent = hashString(navigator.userAgent);
      const fbp = getCookie('_fbp') || hashString('no_fbp_' + Date.now());
      const fbc = getCookie('_fbc') || null;
      
      // Obter informações adicionais do usuário, se disponíveis
      const userData = getUserData();
      
      // Adicionar parâmetros extras
      const extraParams = {
        app: 'meta-tracking',
        event_time: Math.floor(Date.now() / 1000),
        language: navigator.language || 'pt-BR',
        referrer: document.referrer
      };
      
      // Combinar com os dados personalizados
      const enhancedCustomData = {
        ...customData,
        ...extraParams
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
      
      // Adicionar os custom data params
      Object.entries(enhancedCustomData).forEach(([key, value]) => {
        baseParams.append(`cd[${key}]`, value);
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

  // Função principal - detecta a página e envia os eventos
  function init() {
    // Inicializar o pixel do Facebook
    initFacebookPixel();
    
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
})(); 