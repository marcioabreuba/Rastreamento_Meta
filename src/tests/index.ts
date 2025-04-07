/**
 * Script principal para executar todos os testes
 */

import { runAllTests as runAllAPITests } from './api.test';
import { runAllGeoIPTests } from './geoip.test';

/**
 * Executa todos os testes do sistema
 */
async function runAllTests() {
  console.log('🧪 Iniciando suite de testes para o sistema de rastreamento Meta\n');
  console.log('===============================================================\n');
  
  // Teste de geolocalização
  await runAllGeoIPTests();
  console.log('\n===============================================================\n');
  
  // Teste da API (requer servidor rodando)
  await runAllAPITests();
  console.log('\n===============================================================\n');
  
  console.log('🏁 Testes concluídos!');
}

// Executar testes
runAllTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
}); 