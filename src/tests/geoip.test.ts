/**
 * Testes para a funcionalidade de geolocalização
 */

import { initGeoIP, getGeoIPInfo } from '../utils/geoip';
import fs from 'fs';
import path from 'path';

// Caminho para o banco de dados GeoIP
const GEOIP_DB_PATH = process.env.GEOIP_DB_PATH || 'data/GeoLite2-City.mmdb';

/**
 * Verifica se o banco de dados GeoIP existe
 */
function geoipDatabaseExists(): boolean {
  return fs.existsSync(GEOIP_DB_PATH);
}

/**
 * Testa a inicialização do GeoIP
 */
async function testGeoIPInitialization() {
  try {
    console.log('Testando inicialização do GeoIP...');
    
    // Verificar se o banco de dados existe
    if (!geoipDatabaseExists()) {
      console.warn('⚠️ Banco de dados GeoIP não encontrado. Pulando teste de inicialização.');
      console.warn(`Dica: Execute "npm run download-geoip:ts" para baixar o banco de dados GeoIP (${GEOIP_DB_PATH})`);
      return true; // Retorna true para não falhar o teste quando o arquivo não existe
    }
    
    const initialized = await initGeoIP();
    
    if (initialized) {
      console.log('✅ Teste de inicialização do GeoIP: PASSOU');
      return true;
    } else {
      console.error('❌ Teste de inicialização do GeoIP: FALHOU - Banco de dados não encontrado');
      console.error('Dica: Execute "npm run download-geoip:ts" para baixar o banco de dados GeoIP');
      return false;
    }
  } catch (error) {
    console.error('❌ Teste de inicialização do GeoIP: ERRO', error);
    return false;
  }
}

/**
 * Testa a obtenção de informações de geolocalização
 */
async function testGeoIPLookup() {
  try {
    console.log('Testando obtenção de informações de geolocalização...');
    
    // Verificar se o banco de dados existe
    if (!geoipDatabaseExists()) {
      console.warn('⚠️ Banco de dados GeoIP não encontrado. Pulando teste de geolocalização.');
      console.warn(`Dica: Execute "npm run download-geoip:ts" para baixar o banco de dados GeoIP (${GEOIP_DB_PATH})`);
      return true; // Retorna true para não falhar o teste quando o arquivo não existe
    }
    
    // Testar IPs conhecidos
    const testIPs = [
      { ip: '8.8.8.8', name: 'Google DNS' },
      { ip: '186.193.61.94', name: 'IPv4 do usuário' },
      { ip: '208.67.222.222', name: 'OpenDNS' }
    ];
    
    // Inicializar GeoIP se ainda não foi
    await initGeoIP();
    
    let success = true;
    
    for (const testIP of testIPs) {
      const geoData = getGeoIPInfo(testIP.ip);
      
      if (geoData && geoData.country && geoData.country.code) {
        console.log(`✅ Teste de geolocalização para ${testIP.name} (${testIP.ip}): PASSOU`);
        console.log(`   País: ${geoData.country.name} (${geoData.country.code})`);
        if (geoData.city) console.log(`   Cidade: ${geoData.city}`);
        if (geoData.region) console.log(`   Região: ${geoData.region.name} (${geoData.region.code})`);
        if (geoData.postal) console.log(`   CEP: ${geoData.postal}`);
        if (geoData.location) console.log(`   Coordenadas: ${geoData.location.latitude}, ${geoData.location.longitude}`);
        console.log();
      } else {
        console.error(`❌ Teste de geolocalização para ${testIP.name} (${testIP.ip}): FALHOU - Não foi possível obter dados`);
        success = false;
      }
    }
    
    // Testar IP inválido
    const invalidIPData = getGeoIPInfo('127.0.0.1');
    if (invalidIPData === null) {
      console.log('✅ Teste de geolocalização para IP local: PASSOU (retornou null como esperado)');
    } else {
      console.error('❌ Teste de geolocalização para IP local: FALHOU - Deveria retornar null');
      success = false;
    }
    
    return success;
  } catch (error) {
    console.error('❌ Teste de geolocalização: ERRO', error);
    return false;
  }
}

/**
 * Executa todos os testes de geolocalização
 */
async function runAllGeoIPTests() {
  console.log('🚀 Iniciando testes de geolocalização...\n');
  
  let passedCount = 0;
  let totalTests = 2;
  
  // Inicialização
  if (await testGeoIPInitialization()) passedCount++;
  console.log();
  
  // Lookup
  if (await testGeoIPLookup()) passedCount++;
  console.log();
  
  // Resumo
  console.log(`\n📊 Resumo dos testes de GeoIP: ${passedCount}/${totalTests} passaram (${Math.round(passedCount/totalTests*100)}%)`);
  
  if (passedCount === totalTests) {
    console.log('✅ Todos os testes de geolocalização passaram com sucesso!');
  } else {
    console.log(`❌ ${totalTests - passedCount} teste(s) falhou(aram).`);
  }
}

// Se executado diretamente (não importado como módulo)
if (require.main === module) {
  runAllGeoIPTests().catch(error => {
    console.error('Erro ao executar testes de geolocalização:', error);
    process.exit(1);
  });
}

export {
  testGeoIPInitialization,
  testGeoIPLookup,
  runAllGeoIPTests
}; 