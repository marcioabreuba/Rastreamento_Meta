/**
 * Meta Tracking - Script Cliente Avançado
 * 
 * Este script demonstra como usar todos os recursos avançados do sistema de rastreamento Meta,
 * incluindo advanced matching, opções de processamento de dados para conformidade com LGPD/CCPA,
 * segmentação de clientes e eventos específicos.
 * 
 * Versão 1.5.0
 */

(function() {
  // URL do servidor de rastreamento Meta
  const META_TRACKING_URL = 'https://rastreamento-meta.onrender.com';

  // Controle de eventos para evitar duplicação
  const sentEvents = {};

  /**
   * Função principal para rastreamento de eventos
   * 
   * @param {string} eventName - Nome do evento a ser rastreado
   * @param {object} userData - Dados do usuário (para Advanced Matching)
   * @param {object} customData - Dados personalizados do evento
   * @param {object} options - Opções adicionais para o evento
   * @returns {Promise} - Promise com o resultado do envio
   */
  async function trackEvent(eventName, userData = {}, customData = {}, options = {}) {
    try {
      // Verificar se o evento já foi enviado nesta sessão (para evitar duplicação)
      const eventKey = `${eventName}_${JSON.stringify(customData)}`;
      if (sentEvents[eventKey] && !options.allowDuplicate) {
        console.log(`Evento ${eventName} ignorado (duplicado)`);
        return null;
      }

      // Marcar evento como enviado
      sentEvents[eventKey] = true;

      // Coletar dados do navegador
      const browserData = {
        userAgent: navigator.userAgent,
        language: navigator.language || 'pt-BR',
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc') || getUrlParameter('fbclid'),
        referrer: document.referrer
      };

      // Unificar dados do usuário
      const mergedUserData = {
        ...browserData,
        ...userData
      };

      // Preparar dados do evento
      const eventData = {
        eventName,
        userData: mergedUserData,
        customData: {
          ...customData,
          sourceUrl: window.location.href
        }
      };

      // Adicionar flags de processamento de dados para conformidade com LGPD, CCPA, etc.
      if (options.limitDataUse) {
        // LDU (Limited Data Use) para Facebook
        eventData.dataProcessingOptions = ['LDU'];
        eventData.dataProcessingOptionsCountry = 1; // 1 = Brasil
        eventData.dataProcessingOptionsState = 1000;
      }

      // Adicionar segmentação de cliente se disponível
      if (options.customerSegmentation) {
        eventData.customerSegmentation = options.customerSegmentation;
      }

      // Marcar como evento de app se aplicável
      if (options.isAppEvent) {
        eventData.isAppEvent = true;
      }

      // Enviar para o servidor
      const response = await fetch(`${META_TRACKING_URL}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
        keepalive: true
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Evento ${eventName} rastreado com sucesso (ID: ${result.eventId})`);
        return result;
      } else {
        console.error(`❌ Erro ao rastrear evento ${eventName}: ${result.error}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar evento ${eventName}:`, error);
      return null;
    }
  }

  /**
   * Rastreia um evento de Lead com dados
   * 
   * @param {object} leadData - Dados do lead
   * @returns {Promise} - Promise com o resultado do envio
   */
  async function trackLead(leadData) {
    // Extrair os dados do usuário para Advanced Matching
    const userData = {
      email: leadData.email || null,
      phone: leadData.phone || null,
      firstName: leadData.firstName || leadData.name?.split(' ')[0] || null,
      lastName: leadData.lastName || (leadData.name?.split(' ').slice(1).join(' ') || null),
      city: leadData.city || null,
      state: leadData.state || null,
      zip: leadData.zip || leadData.postalCode || null,
      country: leadData.country || 'BR'
    };

    // Preparar dados customizados
    const customData = {
      value: leadData.value || 0,
      currency: leadData.currency || 'BRL',
      contentName: leadData.formName || 'Formulário de Lead',
      contentCategory: leadData.category || 'Lead',
      status: leadData.status || 'submitted'
    };

    // Definir segmentação do cliente se disponível
    const options = {};
    if (leadData.customerType) {
      options.customerSegmentation = {
        priority_segment: leadData.customerType,
        lifecycle_stage: 'lead',
        predicted_ltv_range: leadData.ltv || 'unknown'
      };
    }

    // Configurar processamento limitado de dados se o usuário não consentiu
    options.limitDataUse = !leadData.fullConsent;

    // Rastrear o evento
    return await trackEvent('Lead', userData, customData, options);
  }

  /**
   * Rastreia um evento de Compra com dados
   * 
   * @param {object} orderData - Dados da compra/pedido
   * @returns {Promise} - Promise com o resultado do envio
   */
  async function trackPurchase(orderData) {
    // Extrair os dados do usuário para Advanced Matching
    const userData = {
      email: orderData.customer?.email || null,
      phone: orderData.customer?.phone || null,
      firstName: orderData.customer?.firstName || null,
      lastName: orderData.customer?.lastName || null,
      city: orderData.shipping?.city || null,
      state: orderData.shipping?.state || null,
      zip: orderData.shipping?.zip || null,
      country: orderData.shipping?.country || 'BR'
    };

    // Preparar os conteúdos da compra
    const contents = Array.isArray(orderData.items) ? orderData.items.map(item => ({
      id: item.id || item.productId,
      quantity: item.quantity || 1,
      item_price: item.price || 0
    })) : [];

    // Preparar dados customizados
    const customData = {
      value: orderData.total || 0,
      currency: orderData.currency || 'BRL',
      contentName: 'Purchase Confirmation',
      contentType: 'product',
      contents: contents,
      order_id: orderData.id || orderData.orderId || null,
      num_items: contents.reduce((sum, item) => sum + (item.quantity || 1), 0),
      status: orderData.status || 'completed',
      payment_method: orderData.paymentMethod
    };

    // Definir segmentação do cliente se disponível
    const options = {};
    if (orderData.customer?.type) {
      options.customerSegmentation = {
        priority_segment: orderData.customer.type,
        lifecycle_stage: 'customer',
        predicted_ltv_range: orderData.customer.ltv || 'medium'
      };
    }

    // Rastrear o evento
    return await trackEvent('Purchase', userData, customData, options);
  }

  /**
   * Rastreia eventos de rolagem da página
   * Configurado para 25%, 50%, 75% e 100% da página
   */
  function setupScrollTracking() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let scrollThresholds = [25, 50, 75, 100];
    let scrolledThresholds = {};

    function calculateScrollPercentage() {
      const windowHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      return Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
    }

    function checkScrollThresholds() {
      const scrollPercentage = calculateScrollPercentage();
      
      scrollThresholds.forEach(threshold => {
        if (scrollPercentage >= threshold && !scrolledThresholds[threshold]) {
          scrolledThresholds[threshold] = true;
          
          trackEvent(`Scroll_${threshold}`, {}, {
            contentName: document.title,
            contentCategory: 'Engagement',
            scrollPercentage: threshold
          });
        }
      });
    }

    // Adicionar evento de scroll com throttling para performance
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      
      scrollTimeout = window.requestAnimationFrame(function() {
        checkScrollThresholds();
      });
    }, { passive: true });
  }

  /**
   * Rastreia o tempo na página (1 minuto inicial)
   */
  function setupTimeOnPageTracking() {
    setTimeout(() => {
      trackEvent('Timer_1min', {}, {
        contentName: document.title,
        contentCategory: 'Engagement',
        timeOnPage: '1min'
      });
    }, 60000);
  }

  /**
   * Utilitário para obter parâmetros da URL
   */
  function getUrlParameter(name) {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(name);
  }

  /**
   * Utilitário para obter cookies
   */
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Inicializa o rastreamento automático
   */
  function initialize() {
    // Rastrear PageView automaticamente
    trackEvent('PageView', {}, {
      contentName: document.title,
      contentCategory: window.location.pathname.split('/')[1] || 'home'
    });

    // Configurar rastreamento de engajamento
    setupScrollTracking();
    setupTimeOnPageTracking();

    console.log('✅ Meta Tracking inicializado com recursos avançados');
  }

  // Expor as funções para uso global
  window.MetaTracking = {
    trackEvent,
    trackLead,
    trackPurchase,
    setupScrollTracking,
    setupTimeOnPageTracking
  };

  // Inicializar rastreamento quando o DOM estiver carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(); 