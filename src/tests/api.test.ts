/**
 * Testes para a API do sistema de rastreamento Meta
 */

import fetch from 'node-fetch';

// URL base para os testes (altere para o endereço onde o servidor está rodando)
const BASE_URL = 'http://localhost:3001';

/**
 * Testa a rota de status da API
 */
async function testStatusEndpoint() {
  try {
    console.log('Testando endpoint de status...');
    const response = await fetch(`${BASE_URL}/status`);
    const data = await response.json();
    
    if (response.ok && data.status === 'online') {
      console.log('✅ Teste do status: PASSOU');
      return true;
    } else {
      console.error('❌ Teste do status: FALHOU', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Teste do status: ERRO', error);
    return false;
  }
}

/**
 * Testa a rota de pixel code da API
 */
async function testPixelCodeEndpoint() {
  try {
    console.log('Testando endpoint de pixel code...');
    const response = await fetch(`${BASE_URL}/pixel-code`);
    const data = await response.text();
    
    if (response.ok && data.includes('Meta Pixel Code') && data.includes('fbq')) {
      console.log('✅ Teste do pixel code: PASSOU');
      return true;
    } else {
      console.error('❌ Teste do pixel code: FALHOU');
      return false;
    }
  } catch (error) {
    console.error('❌ Teste do pixel code: ERRO', error);
    return false;
  }
}

/**
 * Testa o rastreamento de evento PageView
 */
async function testPageViewTracking() {
  try {
    console.log('Testando rastreamento de PageView...');
    const payload = {
      eventName: 'PageView',
      userData: {
        email: 'teste@exemplo.com',
        phone: '5511999999999',
        ip: '8.8.8.8', // IP do Google para teste de geolocalização
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      customData: {
        contentName: 'Página de Teste',
        sourceUrl: 'https://exemplo.com/test'
      }
    };
    
    const response = await fetch(`${BASE_URL}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.eventId) {
      console.log('✅ Teste de rastreamento PageView: PASSOU', { eventId: data.eventId });
      return true;
    } else {
      console.error('❌ Teste de rastreamento PageView: FALHOU', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Teste de rastreamento PageView: ERRO', error);
    return false;
  }
}

/**
 * Testa o rastreamento de evento AddToCart
 */
async function testAddToCartTracking() {
  try {
    console.log('Testando rastreamento de AddToCart...');
    const payload = {
      eventName: 'AddToCart',
      userData: {
        email: 'cliente@exemplo.com',
        phone: '5511888888888',
        userId: '12345',
        ip: '1.1.1.1' // IP do Cloudflare para teste de geolocalização
      },
      customData: {
        contentIds: ['123456'],
        contentName: 'Produto de Teste',
        contentCategory: 'Categoria de Teste',
        value: 99.90,
        currency: 'BRL',
        numItems: 2
      }
    };
    
    const response = await fetch(`${BASE_URL}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.eventId) {
      console.log('✅ Teste de rastreamento AddToCart: PASSOU', { eventId: data.eventId });
      return true;
    } else {
      console.error('❌ Teste de rastreamento AddToCart: FALHOU', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Teste de rastreamento AddToCart: ERRO', error);
    return false;
  }
}

/**
 * Testa a geração de código do pixel para um evento
 */
async function testPixelCodeGeneration() {
  try {
    console.log('Testando geração de código do pixel...');
    const payload = {
      eventName: 'Purchase',
      userData: {
        email: 'comprador@exemplo.com'
      },
      customData: {
        value: 199.90,
        currency: 'BRL',
        contentIds: ['123', '456'],
        contentName: 'Compra de Teste',
        orderId: 'ORDER123'
      }
    };
    
    const response = await fetch(`${BASE_URL}/pixel-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.text();
    
    if (response.ok && 
        data.includes('fbq') && 
        data.includes('Purchase') && 
        data.includes('contentName') && 
        data.includes('Compra de Teste')) {
      console.log('✅ Teste de geração de código do pixel: PASSOU');
      return true;
    } else {
      console.error('❌ Teste de geração de código do pixel: FALHOU');
      return false;
    }
  } catch (error) {
    console.error('❌ Teste de geração de código do pixel: ERRO', error);
    return false;
  }
}

/**
 * Executa todos os testes em sequência
 */
async function runAllTests() {
  console.log('🚀 Iniciando testes da API do sistema de rastreamento Meta...\n');
  
  let passedCount = 0;
  let totalTests = 5;
  
  // Status
  if (await testStatusEndpoint()) passedCount++;
  console.log();
  
  // Pixel Code
  if (await testPixelCodeEndpoint()) passedCount++;
  console.log();
  
  // Tracking PageView
  if (await testPageViewTracking()) passedCount++;
  console.log();
  
  // Tracking AddToCart
  if (await testAddToCartTracking()) passedCount++;
  console.log();
  
  // Pixel Code Generation
  if (await testPixelCodeGeneration()) passedCount++;
  console.log();
  
  // Resumo
  console.log(`\n📊 Resumo dos testes: ${passedCount}/${totalTests} passaram (${Math.round(passedCount/totalTests*100)}%)`);
  
  if (passedCount === totalTests) {
    console.log('✅ Todos os testes passaram com sucesso!');
  } else {
    console.log(`❌ ${totalTests - passedCount} teste(s) falhou(aram).`);
  }
}

// Se executado diretamente (não importado como módulo)
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Erro ao executar testes:', error);
    process.exit(1);
  });
}

export {
  testStatusEndpoint,
  testPixelCodeEndpoint,
  testPageViewTracking,
  testAddToCartTracking,
  testPixelCodeGeneration,
  runAllTests
}; 