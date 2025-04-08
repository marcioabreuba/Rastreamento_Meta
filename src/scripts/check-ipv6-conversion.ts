/**
 * Teste de conversão de IPv4 para IPv6
 * 
 * Este script testa a conversão de IPv4 para IPv6
 * e a funcionalidade de geolocalização com ambos os formatos.
 */

import { convertIPv4ToIPv6, initGeoIP, getGeoIPInfo } from '../utils/geoip';

async function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('📝 Teste de Conversão de IPv4 para IPv6');
  console.log('═════════════════════════════════════════════════════');
  
  // Lista de IPs de teste
  const testIPs = [
    { description: 'IP Google DNS', ip: '8.8.8.8' },
    { description: 'IP Cloudflare', ip: '1.1.1.1' },
    { description: 'IP Amazon AWS', ip: '3.5.140.2' },
    { description: 'IP Brasileiro (UOL)', ip: '200.147.3.157' },
    { description: 'IPv6 Google', ip: '2001:4860:4860::8888' },
    { description: 'IPv6 formatado com IPv4 embutido', ip: '::ffff:192.168.1.1' }
  ];
  
  // Inicializar o GeoIP
  const initialized = await initGeoIP();
  if (!initialized) {
    console.error('❌ Não foi possível inicializar o GeoIP. Verifique se o banco de dados está disponível.');
    return;
  }
  
  console.log('✅ GeoIP inicializado com sucesso!\n');
  
  // Testar cada IP
  for (const testIP of testIPs) {
    console.log(`\n🔹 Testando: ${testIP.description} (${testIP.ip})`);
    
    // Converter para IPv6
    const ipv6 = convertIPv4ToIPv6(testIP.ip);
    console.log(`  • IPv4 Original: ${testIP.ip}`);
    console.log(`  • IPv6 Convertido: ${ipv6}`);
    
    // Verificar geolocalização com o IP original
    const geoDataOriginal = getGeoIPInfo(testIP.ip);
    console.log('\n  📍 Geolocalização com IP Original:');
    if (geoDataOriginal) {
      console.log(`    País: ${geoDataOriginal.country?.name} (${geoDataOriginal.country?.code})`);
      console.log(`    Estado: ${geoDataOriginal.region?.name} (${geoDataOriginal.region?.code})`);
      console.log(`    Cidade: ${geoDataOriginal.city}`);
      console.log(`    CEP: ${geoDataOriginal.postal}`);
    } else {
      console.log('    ⚠️ Não foi possível obter dados de geolocalização');
    }
    
    // Verificar geolocalização com IPv6
    const geoDataIPv6 = getGeoIPInfo(ipv6);
    console.log('\n  📍 Geolocalização com IPv6:');
    if (geoDataIPv6) {
      console.log(`    País: ${geoDataIPv6.country?.name} (${geoDataIPv6.country?.code})`);
      console.log(`    Estado: ${geoDataIPv6.region?.name} (${geoDataIPv6.region?.code})`);
      console.log(`    Cidade: ${geoDataIPv6.city}`);
      console.log(`    CEP: ${geoDataIPv6.postal}`);
    } else {
      console.log('    ⚠️ Não foi possível obter dados de geolocalização');
    }
    
    console.log('─────────────────────────────────────────────────────');
  }
  
  console.log('\n✨ Teste concluído!');
}

main().catch(error => {
  console.error('Erro ao executar o teste:', error);
  process.exit(1);
}); 