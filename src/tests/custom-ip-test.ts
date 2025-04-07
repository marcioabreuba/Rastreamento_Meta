/**
 * Teste personalizado para IPs específicos
 */

import { initGeoIP, getGeoIPInfo } from '../utils/geoip';

async function testCustomIPs() {
  console.log('🧪 Iniciando teste de IPs personalizados\n');
  
  // Inicializar o GeoIP
  await initGeoIP();
  
  // Testar IPv4 do usuário
  const ipv4 = '186.193.61.94';
  console.log(`\n📍 Testando IPv4: ${ipv4}`);
  const ipv4Data = getGeoIPInfo(ipv4);
  
  if (ipv4Data) {
    console.log('✅ Dados encontrados:');
    console.log(`   País: ${ipv4Data.country?.name} (${ipv4Data.country?.code})`);
    console.log(`   Região: ${ipv4Data.region?.name || 'N/A'} (${ipv4Data.region?.code || 'N/A'})`);
    console.log(`   Cidade: ${ipv4Data.city || 'N/A'}`);
    console.log(`   CEP: ${ipv4Data.postal || 'N/A'}`);
    
    if (ipv4Data.location) {
      console.log(`   Coordenadas: ${ipv4Data.location.latitude}, ${ipv4Data.location.longitude}`);
      console.log(`   Fuso horário: ${ipv4Data.location.timeZone || 'N/A'}`);
      console.log(`   Raio de precisão: ${ipv4Data.location.accuracyRadius || 'N/A'}`);
    }
  } else {
    console.log('❌ Não foi possível obter dados para este IPv4');
  }
  
  // Testar IPv6 do usuário
  const ipv6 = '2804:1054:3013:b4a0:d03a:d102:b600:2a6b';
  console.log(`\n📍 Testando IPv6: ${ipv6}`);
  const ipv6Data = getGeoIPInfo(ipv6);
  
  if (ipv6Data) {
    console.log('✅ Dados encontrados:');
    console.log(`   País: ${ipv6Data.country?.name} (${ipv6Data.country?.code})`);
    console.log(`   Região: ${ipv6Data.region?.name || 'N/A'} (${ipv6Data.region?.code || 'N/A'})`);
    console.log(`   Cidade: ${ipv6Data.city || 'N/A'}`);
    console.log(`   CEP: ${ipv6Data.postal || 'N/A'}`);
    
    if (ipv6Data.location) {
      console.log(`   Coordenadas: ${ipv6Data.location.latitude}, ${ipv6Data.location.longitude}`);
      console.log(`   Fuso horário: ${ipv6Data.location.timeZone || 'N/A'}`);
      console.log(`   Raio de precisão: ${ipv6Data.location.accuracyRadius || 'N/A'}`);
    }
  } else {
    console.log('❌ Não foi possível obter dados para este IPv6');
  }
  
  // Testar também o IP do Cloudflare para comparação
  const cloudflareIP = '1.1.1.1';
  console.log(`\n📍 Testando Cloudflare DNS: ${cloudflareIP}`);
  const cloudflareData = getGeoIPInfo(cloudflareIP);
  
  if (cloudflareData) {
    console.log('✅ Dados encontrados:');
    console.log(`   País: ${cloudflareData.country?.name} (${cloudflareData.country?.code})`);
  } else {
    console.log('❌ Não foi possível obter dados para o Cloudflare DNS');
  }
  
  console.log('\n🏁 Teste de IPs concluído!');
}

// Executar o teste
testCustomIPs().catch(error => {
  console.error('Erro ao executar teste:', error);
}); 