# Exemplos de Código para o Sistema de Rastreamento Meta

Este documento contém exemplos práticos de código para testar e implementar o sistema de rastreamento Meta.

## Índice

1. [Testando com cURL](#1-testando-com-curl)
2. [Exemplos de Requisição com JavaScript](#2-exemplos-de-requisição-com-javascript)
3. [Exemplos de Requisição com PHP](#3-exemplos-de-requisição-com-php)
4. [Testes com Postman](#4-testes-com-postman)
5. [Verificação de Status do Sistema](#5-verificação-de-status-do-sistema)

## 1. Testando com cURL

### 1.1 Verificar Status do Servidor

```bash
curl -X GET https://seu-servidor.onrender.com/status
```

Resposta esperada:
```json
{
  "status": "online",
  "timestamp": 1697307865432,
  "version": "1.0.0"
}
```

### 1.2 Enviar Evento PageView

```bash
curl -X POST https://seu-servidor.onrender.com/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "PageView",
    "userData": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "fbp": "_fb.1.1612345678901.123456789",
      "ipAddress": "8.8.8.8"
    },
    "customData": {
      "sourceUrl": "https://minha-loja.com/pagina-teste",
      "contentName": "Página de Teste",
      "contentCategory": "teste"
    }
  }'
```

### 1.3 Enviar Evento AddToCart

```bash
curl -X POST https://seu-servidor.onrender.com/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "AddToCart",
    "userData": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "fbp": "_fb.1.1612345678901.123456789",
      "email": "cliente@example.com",
      "ipAddress": "8.8.8.8"
    },
    "customData": {
      "sourceUrl": "https://minha-loja.com/produtos/123",
      "contentType": "product",
      "contentIds": ["123"],
      "contentName": "Produto de Teste",
      "contentCategory": "Categoria de Teste",
      "value": 99.90,
      "currency": "BRL",
      "numItems": 1
    }
  }'
```

### 1.4 Enviar Evento Purchase

```bash
curl -X POST https://seu-servidor.onrender.com/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Purchase",
    "userData": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "fbp": "_fb.1.1612345678901.123456789",
      "email": "cliente@example.com",
      "ipAddress": "8.8.8.8"
    },
    "customData": {
      "sourceUrl": "https://minha-loja.com/agradecimento",
      "contentType": "product",
      "contentIds": ["123", "456"],
      "contentName": "Compra #12345",
      "value": 199.80,
      "currency": "BRL",
      "numItems": 2,
      "contents": [
        {
          "id": "123",
          "name": "Produto 1",
          "quantity": 1,
          "price": 99.90
        },
        {
          "id": "456",
          "name": "Produto 2",
          "quantity": 1,
          "price": 99.90
        }
      ],
      "orderId": "12345"
    }
  }'
```

### 1.5 Obter Código de Pixel

```bash
curl -X GET https://seu-servidor.onrender.com/pixel-code
```

## 2. Exemplos de Requisição com JavaScript

### 2.1 Função Básica de Rastreamento

```javascript
/**
 * Função para rastreamento de eventos
 * @param {string} eventName Nome do evento
 * @param {Object} userData Dados do usuário
 * @param {Object} customData Dados personalizados do evento
 */
function trackEvent(eventName, userData = {}, customData = {}) {
  // Adicionar dados comuns
  userData = {
    ...userData,
    userAgent: navigator.userAgent,
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc') || getURLParameter('fbclid')
  };
  
  // Adicionar dados da página
  customData = {
    ...customData,
    sourceUrl: window.location.href
  };
  
  // Enviar dados para o servidor
  return fetch('https://seu-servidor.onrender.com/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eventName,
      userData,
      customData
    }),
    keepalive: true
  })
  .then(response => response.json())
  .then(data => {
    console.log(`Evento ${eventName} rastreado com sucesso:`, data);
    return data;
  })
  .catch(error => {
    console.error(`Erro ao rastrear evento ${eventName}:`, error);
    throw error;
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
```

### 2.2 Exemplo Completo com Rastreamento de Eventos

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Rastrear PageView em todas as páginas
  trackEvent('PageView', {}, {
    contentName: document.title
  });
  
  // Rastrear visualização de produto (em páginas de produto)
  if (window.location.pathname.includes('/products/')) {
    const productData = {
      // Obtenha estes dados da sua página
      contentIds: [productId],
      contentName: productName,
      contentType: 'product',
      contentCategory: productCategory,
      value: productPrice,
      currency: 'BRL'
    };
    
    trackEvent('ViewContent', {}, productData);
  }
  
  // Rastrear adição ao carrinho
  const addToCartButtons = document.querySelectorAll('.add-to-cart-button');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      const productId = this.getAttribute('data-product-id');
      const productName = this.getAttribute('data-product-name');
      const productPrice = parseFloat(this.getAttribute('data-product-price'));
      const productCategory = this.getAttribute('data-product-category');
      const quantity = parseInt(document.querySelector('#quantity').value || 1);
      
      trackEvent('AddToCart', {}, {
        contentIds: [productId],
        contentName: productName,
        contentType: 'product',
        contentCategory: productCategory,
        value: productPrice * quantity,
        currency: 'BRL',
        numItems: quantity
      });
    });
  });
});
```

### 2.3 Implementação com async/await

```javascript
async function trackEventAsync(eventName, userData = {}, customData = {}) {
  try {
    // Adicionar dados comuns
    userData = {
      ...userData,
      userAgent: navigator.userAgent,
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc') || getURLParameter('fbclid')
    };
    
    // Adicionar dados da página
    customData = {
      ...customData,
      sourceUrl: window.location.href
    };
    
    // Enviar dados para o servidor
    const response = await fetch('https://seu-servidor.onrender.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventName,
        userData,
        customData
      }),
      keepalive: true
    });
    
    const data = await response.json();
    console.log(`Evento ${eventName} rastreado com sucesso:`, data);
    return data;
  } catch (error) {
    console.error(`Erro ao rastrear evento ${eventName}:`, error);
    throw error;
  }
}

// Exemplo de uso com async/await
async function rastrearCompra(orderId, orderValue, products) {
  try {
    const result = await trackEventAsync('Purchase', 
      { email: customerEmail }, 
      {
        contentType: 'product',
        contentIds: products.map(p => p.id),
        value: orderValue,
        currency: 'BRL',
        numItems: products.length,
        contents: products,
        orderId: orderId
      }
    );
    
    console.log('Compra rastreada:', result);
  } catch (error) {
    console.error('Falha ao rastrear compra:', error);
  }
}
```

## 3. Exemplos de Requisição com PHP

### 3.1 Função de Rastreamento Básica em PHP

```php
<?php
/**
 * Função para rastrear eventos
 * 
 * @param string $eventName Nome do evento
 * @param array $userData Dados do usuário
 * @param array $customData Dados personalizados do evento
 * @return array Resposta da API
 */
function trackEvent($eventName, $userData = [], $customData = []) {
    $url = 'https://seu-servidor.onrender.com/track';
    
    // Adicionar IP do usuário, se não fornecido
    if (!isset($userData['ipAddress'])) {
        $userData['ipAddress'] = $_SERVER['REMOTE_ADDR'];
    }
    
    // Adicionar User-Agent, se não fornecido
    if (!isset($userData['userAgent'])) {
        $userData['userAgent'] = $_SERVER['HTTP_USER_AGENT'] ?? null;
    }
    
    // Adicionar URL de origem, se não fornecida
    if (!isset($customData['sourceUrl'])) {
        $customData['sourceUrl'] = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . 
            "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    }
    
    // Preparar dados para envio
    $data = [
        'eventName' => $eventName,
        'userData' => $userData,
        'customData' => $customData
    ];
    
    // Inicializar cURL
    $ch = curl_init();
    
    // Configurar opções do cURL
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen(json_encode($data))
    ]);
    
    // Executar requisição
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Verificar erros
    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        return [
            'success' => false,
            'error' => $error
        ];
    }
    
    // Fechar conexão
    curl_close($ch);
    
    // Retornar resposta
    return json_decode($response, true);
}
```

### 3.2 Exemplo de Uso em PHP

```php
<?php
// Rastrear visualização de página
$pageViewResult = trackEvent('PageView', 
    [
        'email' => $currentUser->email ?? null,
        'fbp' => $_COOKIE['_fbp'] ?? null,
        'fbc' => $_COOKIE['_fbc'] ?? $_GET['fbclid'] ?? null
    ],
    [
        'contentName' => 'Página Inicial',
        'contentCategory' => 'home'
    ]
);

// Verificar resultado
if ($pageViewResult['success']) {
    echo "Evento PageView rastreado com sucesso. Event ID: " . $pageViewResult['eventId'];
} else {
    echo "Erro ao rastrear PageView: " . ($pageViewResult['error'] ?? 'Erro desconhecido');
}

// Rastrear compra em uma página de confirmação
if ($orderCompleted) {
    $orderItems = [];
    $contentIds = [];
    
    foreach ($order->getItems() as $item) {
        $orderItems[] = [
            'id' => $item->getProductId(),
            'name' => $item->getName(),
            'quantity' => $item->getQuantity(),
            'price' => $item->getPrice()
        ];
        
        $contentIds[] = $item->getProductId();
    }
    
    $purchaseResult = trackEvent('Purchase',
        [
            'email' => $order->getCustomerEmail(),
            'externalId' => $order->getCustomerId()
        ],
        [
            'contentType' => 'product',
            'contentIds' => $contentIds,
            'value' => $order->getTotal(),
            'currency' => 'BRL',
            'numItems' => count($order->getItems()),
            'contents' => $orderItems,
            'orderId' => $order->getId()
        ]
    );
    
    // Registrar resultado
    error_log("Rastreamento de compra: " . json_encode($purchaseResult));
}
```

## 4. Testes com Postman

### 4.1 Coleção Postman para Testes

Você pode importar a seguinte coleção para o Postman:

```json
{
  "info": {
    "name": "Meta Tracking API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Status Check",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/status",
          "host": ["{{baseUrl}}"],
          "path": ["status"]
        }
      }
    },
    {
      "name": "Get Pixel Code",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/pixel-code",
          "host": ["{{baseUrl}}"],
          "path": ["pixel-code"]
        }
      }
    },
    {
      "name": "Track PageView",
      "request": {
        "method": "POST",
        "url": {
          "raw": "{{baseUrl}}/track",
          "host": ["{{baseUrl}}"],
          "path": ["track"]
        },
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"eventName\": \"PageView\",\n  \"userData\": {\n    \"userAgent\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\",\n    \"fbp\": \"_fb.1.1612345678901.123456789\",\n    \"ipAddress\": \"8.8.8.8\"\n  },\n  \"customData\": {\n    \"sourceUrl\": \"https://minha-loja.com/pagina-teste\",\n    \"contentName\": \"Página de Teste\",\n    \"contentCategory\": \"teste\"\n  }\n}"
        }
      }
    },
    {
      "name": "Track AddToCart",
      "request": {
        "method": "POST",
        "url": {
          "raw": "{{baseUrl}}/track",
          "host": ["{{baseUrl}}"],
          "path": ["track"]
        },
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"eventName\": \"AddToCart\",\n  \"userData\": {\n    \"userAgent\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\",\n    \"fbp\": \"_fb.1.1612345678901.123456789\",\n    \"email\": \"teste@example.com\",\n    \"ipAddress\": \"8.8.8.8\"\n  },\n  \"customData\": {\n    \"sourceUrl\": \"https://minha-loja.com/produtos/123\",\n    \"contentType\": \"product\",\n    \"contentIds\": [\"123\"],\n    \"contentName\": \"Produto de Teste\",\n    \"contentCategory\": \"Categoria Teste\",\n    \"value\": 99.90,\n    \"currency\": \"BRL\",\n    \"numItems\": 1\n  }\n}"
        }
      }
    }
  ]
}
```

Configure uma variável de ambiente `baseUrl` no Postman com o valor da URL do seu servidor (por exemplo, `https://seu-servidor.onrender.com`).

## 5. Verificação de Status do Sistema

### 5.1 Script de Monitoramento Básico

```bash
#!/bin/bash
# Monitoramento simples do sistema de rastreamento

SERVER_URL="https://seu-servidor.onrender.com"
LOG_FILE="monitor.log"

echo "$(date) - Iniciando verificação..." >> $LOG_FILE

# Verificar status do servidor
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL/status)

if [ $STATUS_CODE -eq 200 ]; then
  echo "$(date) - Servidor online (HTTP $STATUS_CODE)" >> $LOG_FILE
else
  echo "$(date) - ALERTA: Servidor pode estar offline (HTTP $STATUS_CODE)" >> $LOG_FILE
  # Aqui você pode adicionar código para enviar um alerta por email ou SMS
fi

# Testar rastreamento com um evento fictício
TRACK_RESPONSE=$(curl -s -X POST $SERVER_URL/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "SystemCheck",
    "userData": {
      "userAgent": "SystemMonitor/1.0",
      "ipAddress": "127.0.0.1"
    },
    "customData": {
      "sourceUrl": "internal-monitor",
      "checkTime": "'$(date)'"
    }
  }')

if [[ $TRACK_RESPONSE == *"success"* ]]; then
  echo "$(date) - Rastreamento funcionando corretamente" >> $LOG_FILE
else
  echo "$(date) - ALERTA: Problema no rastreamento: $TRACK_RESPONSE" >> $LOG_FILE
  # Aqui você pode adicionar código para enviar um alerta por email ou SMS
fi

echo "$(date) - Verificação concluída." >> $LOG_FILE
```

### 5.2 Verificação de GeoIP

```bash
curl -X POST https://seu-servidor.onrender.com/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "GeoIPTest",
    "userData": {
      "userAgent": "GeoIPTest/1.0",
      "ipAddress": "8.8.8.8"
    },
    "customData": {
      "sourceUrl": "test-geoip",
      "testTime": "'$(date)'"
    }
  }'
```

---

Este documento fornece exemplos básicos para testar e implementar o sistema de rastreamento Meta. Esses exemplos podem ser adaptados conforme necessário para seu caso de uso específico. 