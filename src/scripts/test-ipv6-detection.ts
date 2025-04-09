/**
 * Script para testar a detecção e manipulação de IPv6
 * 
 * Este script testa a funcionalidade de detecção, conversão e
 * consulta de geolocalização para diferentes formatos de IP
 */

import { convertIPv4ToIPv6, isRealIPv6, initGeoIP, getGeoIPInfo } from '../utils/geoip';

async function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('📝 Teste de Detecção e Manipulação de IPv6');
  console.log('═════════════════════════════════════════════════════');
  
  // Inicializar o GeoIP
  const initialized = await initGeoIP();
  if (!initialized) {
    console.error('❌ Não foi possível inicializar o GeoIP. Verifique se o banco de dados está disponível.');
    return;
  }
  
  console.log('✅ GeoIP inicializado com sucesso!\n');
  
  // Lista de IPs para teste
  const testIPs = [
    { description: 'IPv4 comum', ip: '8.8.8.8' },
    { description: 'IPv4 brasileiro', ip: '186.193.61.94' },
    { description: 'IPv6-mapped convertido por nós', ip: '::ffff:8.8.8.8' },
    { description: 'IPv6 real do Google', ip: '2001:4860:4860::8888' },
    { description: 'IPv6 brasileiro', ip: '2804:1054:3013:b4a0:d03a:d102:b600:2a6b' },
    { description: 'IPv6-mapped já no formato', ip: '::ffff:186.193.61.94' }
  ];
  
  // Testar cada IP
  for (const testIP of testIPs) {
    console.log(`\n🔹 Testando: ${testIP.description} (${testIP.ip})`);
    
    // Verificar se é IPv6 real
    const isIPv6 = isRealIPv6(testIP.ip);
    console.log(`  • É IPv6 real: ${isIPv6 ? 'Sim' : 'Não'}`);
    
    // Converter para IPv6 (ou manter se já for)
    const ipv6 = convertIPv4ToIPv6(testIP.ip);
    console.log(`  • Após conversão: ${ipv6}`);
    
    // Verificar geolocalização
    const geoData = getGeoIPInfo(testIP.ip);
    console.log('\n  📍 Geolocalização:');
    if (geoData) {
      console.log(`    IP armazenado: ${geoData.ip}`);
      console.log(`    IPv6 real: ${geoData.isIPv6 ? 'Sim' : 'Não'}`);
      console.log(`    País: ${geoData.country?.name} (${geoData.country?.code})`);
      console.log(`    Estado: ${geoData.region?.name || 'N/A'} (${geoData.region?.code || 'N/A'})`);
      console.log(`    Cidade: ${geoData.city || 'N/A'}`);
      console.log(`    CEP: ${geoData.postal || 'N/A'}`);
      if (geoData.location) {
        console.log(`    Coordenadas: ${geoData.location.latitude}, ${geoData.location.longitude}`);
      }
    } else {
      console.log('    ❌ Não foi possível obter dados de geolocalização');
    }
    
    console.log('─────────────────────────────────────────────────────');
  }
  
  console.log('\n📣 Teste concluído!');
}

main().catch(error => {
  console.error('Erro ao executar testes:', error);
  process.exit(1);
}); 