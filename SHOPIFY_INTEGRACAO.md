# Integração com Shopify

Este documento fornece instruções detalhadas sobre como integrar o sistema de rastreamento Meta com sua loja Shopify.

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação do Pixel Base](#2-instalação-do-pixel-base)
3. [Configuração do Servidor de Rastreamento](#3-configuração-do-servidor-de-rastreamento)
4. [Rastreamento de Eventos Específicos](#4-rastreamento-de-eventos-específicos)
5. [Testando a Integração](#5-testando-a-integração)
6. [Solução de Problemas](#6-solução-de-problemas)

## 1. Pré-requisitos

Antes de começar, certifique-se de que você tem:

- Acesso administrativo à sua loja Shopify
- ID do Facebook Pixel configurado no Facebook Business Manager
- O servidor de rastreamento Meta implantado e acessível online
- URL do servidor de rastreamento (ex: `https://meta-tracking.onrender.com`)

## 2. Instalação do Pixel Base

### 2.1. Acessar o Editor de Temas

1. Faça login no painel administrativo do Shopify
2. Navegue até **Vendas online** > **Temas**
3. Encontre seu tema atual e clique em **Ações** > **Editar código**

### 2.2. Adicionar o Código Base do Meta Pixel

1. No editor de código, localize o arquivo `theme.liquid`
2. Este arquivo contém o layout principal da sua loja
3. Localize a tag `</head>` (antes do fechamento da seção head)
4. Adicione o seguinte código imediatamente antes da tag `</head>`:

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'SEU_PIXEL_ID_AQUI');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=SEU_PIXEL_ID_AQUI&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
```

> **IMPORTANTE**: Substitua `SEU_PIXEL_ID_AQUI` pelo seu ID real do Facebook Pixel.

## 3. Configuração do Servidor de Rastreamento

### 3.1. Adicionar o Script de Integração

Após o código do Meta Pixel, adicione o seguinte script que conecta sua loja ao servidor de rastreamento:

```html
<!-- Meta Tracking Server Integration -->
<script>
// Configuração
const META_TRACKING_URL = 'URL_DO_SEU_SERVIDOR_AQUI'; // Ex: https://meta-tracking.onrender.com

// Função principal para rastrear eventos
function trackEvent(eventName, userData = {}, customData = {}) {
  // Coletar dados comuns
  userData = {
    ...userData,
    userAgent: navigator.userAgent,
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc') || getURLParameter('fbclid'),
    ipAddress: null // O servidor vai detectar o IP
  };
  
  // Adicionar dados de página
  customData = {
    ...customData,
    sourceUrl: window.location.href,
    referrer: document.referrer
  };
  
  // Debug
  console.log(`Rastreando evento: ${eventName}`);
  
  // Enviar para o servidor
  fetch(`${META_TRACKING_URL}/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventName,
      userData,
      customData,
    }),
    keepalive: true
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Evento rastreado com sucesso: ${eventName} (ID: ${data.eventId})`);
    } else {
      console.error(`Erro ao rastrear evento: ${data.error}`);
    }
  })
  .catch(error => {
    console.error('Erro ao conectar ao servidor de rastreamento:', error);
  });
}

// Funções auxiliares
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getURLParameter(name) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(name);
}

// Rastrear PageView automaticamente em todas as páginas
document.addEventListener('DOMContentLoaded', function() {
  trackEvent('PageView', {}, {
    contentName: document.title,
    contentCategory: window.location.pathname.split('/')[1] || 'home'
  });
});
</script>
<!-- End Meta Tracking Server Integration -->
```

> **IMPORTANTE**: Substitua `URL_DO_SEU_SERVIDOR_AQUI` pela URL real do seu servidor de rastreamento.

## 4. Rastreamento de Eventos Específicos

### 4.1. Página de Produto (ViewContent)

Para rastrear visualizações de produto, adicione o seguinte código no arquivo `templates/product.liquid` ou no arquivo principal do seu tema de produto:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  {% if product %}
  // Dados do produto
  const productData = {
    content_ids: ['{{ product.id }}'],
    content_name: '{{ product.title | replace: "'", "\\'" }}',
    content_type: 'product',
    content_category: '{{ product.type | replace: "'", "\\'" }}',
    value: {{ product.price | money_without_currency | replace: ',', '.' }},
    currency: '{{ shop.currency }}'
  };
  
  // Dados do usuário
  const userData = {
    {% if customer %}
    external_id: '{{ customer.id }}',
    email: '{{ customer.email }}',
    {% endif %}
    client_user_agent: navigator.userAgent
  };
  
  // Rastrear visualização de produto
  trackEvent('ViewContent', userData, productData);
  {% endif %}
});
</script>
```

### 4.2. Adicionar ao Carrinho (AddToCart)

Para rastrear adições ao carrinho, adicione este script na página do produto:

```html
<script>
// Rastrear adição ao carrinho
document.addEventListener('DOMContentLoaded', function() {
  const addToCartForm = document.querySelector('form[action="/cart/add"]');
  
  if (addToCartForm) {
    addToCartForm.addEventListener('submit', function(e) {
      // Obter quantidade
      let quantity = 1;
      const quantityInput = addToCartForm.querySelector('input[name="quantity"]');
      if (quantityInput) {
        quantity = parseInt(quantityInput.value, 10) || 1;
      }
      
      {% if product %}
      // Dados do evento
      const eventData = {
        content_ids: ['{{ product.id }}'],
        content_name: '{{ product.title | replace: "'", "\\'" }}',
        content_type: 'product',
        content_category: '{{ product.type | replace: "'", "\\'" }}',
        value: {{ product.price | money_without_currency | replace: ',', '.' }} * quantity,
        currency: '{{ shop.currency }}',
        num_items: quantity
      };
      
      // Dados do usuário
      const userData = {
        {% if customer %}
        external_id: '{{ customer.id }}',
        email: '{{ customer.email }}',
        {% endif %}
        client_user_agent: navigator.userAgent
      };
      
      // Rastrear evento
      trackEvent('AddToCart', userData, eventData);
      {% endif %}
    });
  }
});
</script>
```

### 4.3. Iniciar Checkout (InitiateCheckout)

Adicione o seguinte código ao arquivo `layout/checkout.liquid` (se acessível) ou use a injeção de script nas configurações de checkout do Shopify:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('/checkouts/')) {
    let totalValue = 0;
    let itemCount = 0;
    let contentIds = [];
    
    {% if checkout %}
    totalValue = {{ checkout.total_price | money_without_currency | replace: ',', '.' }};
    itemCount = {{ checkout.line_items.size }};
    contentIds = [{% for item in checkout.line_items %}'{{ item.product_id }}'{% unless forloop.last %},{% endunless %}{% endfor %}];
    {% endif %}
    
    const eventData = {
      content_ids: contentIds,
      content_type: 'product',
      value: totalValue,
      currency: '{{ shop.currency }}',
      num_items: itemCount
    };
    
    const userData = {
      {% if checkout.customer %}
      external_id: '{{ checkout.customer.id }}',
      email: '{{ checkout.customer.email }}',
      {% endif %}
      client_user_agent: navigator.userAgent
    };
    
    trackEvent('InitiateCheckout', userData, eventData);
  }
});
</script>
```

### 4.4. Compra Concluída (Purchase)

Para rastrear compras concluídas, adicione este código à página de confirmação de pedido (a maioria das lojas usa a página `thank_you.liquid` ou um script em `additional_scripts_checkout`):

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('/thank_you')) {
    {% if checkout and checkout.order_id %}
    const orderValue = {{ checkout.total_price | money_without_currency | replace: ',', '.' }};
    const itemCount = {{ checkout.line_items.size }};
    const orderCurrency = '{{ shop.currency }}';
    
    // Dados detalhados do pedido
    const contentIds = [{% for item in checkout.line_items %}'{{ item.product_id }}'{% unless forloop.last %},{% endunless %}{% endfor %}];
    const contents = [
      {% for item in checkout.line_items %}
      {
        id: '{{ item.product_id }}',
        name: '{{ item.title | replace: "'", "\\'" }}',
        quantity: {{ item.quantity }},
        price: {{ item.price | money_without_currency | replace: ',', '.' }}
      }{% unless forloop.last %},{% endunless %}
      {% endfor %}
    ];
    
    // Informações do usuário
    const userData = {
      {% if checkout.customer %}
      external_id: '{{ checkout.customer.id }}',
      email: '{{ checkout.email }}',
      {% endif %}
      client_user_agent: navigator.userAgent
    };
    
    // Dados do evento
    const eventData = {
      content_ids: contentIds,
      content_type: 'product',
      contents: contents,
      value: orderValue,
      currency: orderCurrency,
      num_items: itemCount,
      order_id: '{{ checkout.order_id }}'
    };
    
    // Rastrear compra
    trackEvent('Purchase', userData, eventData);
    {% endif %}
  }
});
</script>
```

## 5. Testando a Integração

### 5.1. Verificação Visual no Navegador

1. Abra sua loja Shopify
2. Abra as ferramentas de desenvolvedor (F12)
3. Vá para a guia "Console"
4. Procure mensagens como "Rastreando evento: PageView" e "Evento rastreado com sucesso"

### 5.2. Verificação nos Logs do Servidor

1. Acesse o painel do Render
2. Vá para seu Web Service > Logs
3. Procure entradas de log que mostrem eventos recebidos

### 5.3. Verificação no Facebook

1. Acesse o Facebook Business Manager
2. Vá para "Events Manager" > seu Pixel
3. Verifique se os eventos estão sendo recebidos
4. Use o Facebook Pixel Helper (extensão do Chrome) para verificar o Pixel

## 6. Solução de Problemas

### 6.1. Eventos Não Aparecem

Se os eventos não estiverem aparecendo no Facebook:

1. **Verifique o Console**: Procure erros no console do navegador
2. **Verifique os Logs do Servidor**: Veja se o servidor está recebendo e processando os eventos
3. **Verifique Bloqueadores**: Adblockers e ferramentas de privacidade podem bloquear o Pixel

### 6.2. Erros no Console

Se você vir erros no console:

#### Erro de CORS

```
Access to fetch at 'https://seu-servidor.onrender.com/track' from origin 'https://sua-loja.myshopify.com' has been blocked by CORS policy
```

**Solução**: Verifique se o servidor está configurado para aceitar solicitações da origem da sua loja.

#### Erro de Conexão

```
Failed to fetch: NetworkError
```

**Solução**: Verifique se o servidor está online e se a URL está correta.

### 6.3. Dados Incorretos

Se os dados estiverem aparecendo incorretamente:

1. **Verifique a Sintaxe Liquid**: Certifique-se de que as variáveis do Shopify estão sendo renderizadas corretamente
2. **Verifique a Formatação**: Especialmente com valores monetários e strings com caracteres especiais

## 7. Modelo de Implementação Completa

Para facilitar a implementação, você pode criar um snippet personalizado com todo o código de rastreamento.

1. No editor de código do Shopify, crie um novo snippet: `Seções` > `Adicionar uma nova seção`
2. Nomeie-o como `meta-tracking.liquid`
3. Adicione todo o código de rastreamento neste snippet
4. Inclua o snippet no seu tema com: `{% section 'meta-tracking' %}`

---

Para suporte adicional ou personalização da integração, consulte a documentação completa do projeto ou entre em contato com o desenvolvedor. 