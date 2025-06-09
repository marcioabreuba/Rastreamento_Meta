/**
 * Testes unitários para utilitários de validação
 */

import { 
  normalizeBrazilianZipCode, 
  isPrivateIP, 
  isValidEmail, 
  isValidBrazilianPhone 
} from '../utils/validators';

// Função auxiliar para executar testes
function runTest(testName: string, testFunction: () => boolean): void {
  try {
    const result = testFunction();
    console.log(`✅ ${testName}: ${result ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log(`❌ ${testName}: ERROR - ${error}`);
  }
}

// Testes para normalizeBrazilianZipCode
function testNormalizeBrazilianZipCode(): boolean {
  const tests = [
    { input: ['12345', 'br'], expected: '12345000' },
    { input: ['12345678', 'br'], expected: '12345678' },
    { input: ['12345-123', 'br'], expected: '12345123' },
    { input: ['12345', 'us'], expected: '12345' },
    { input: [null, 'br'], expected: null },
    { input: ['', 'br'], expected: null },
  ];

  for (const test of tests) {
    const result = normalizeBrazilianZipCode(test.input[0], test.input[1]);
    if (result !== test.expected) {
      console.log(`Expected ${test.expected}, got ${result} for input ${JSON.stringify(test.input)}`);
      return false;
    }
  }
  return true;
}

// Testes para isPrivateIP
function testIsPrivateIP(): boolean {
  const tests = [
    { input: '127.0.0.1', expected: true },
    { input: 'localhost', expected: true },
    { input: '192.168.1.1', expected: true },
    { input: '10.0.0.1', expected: true },
    { input: '172.16.0.1', expected: true },
    { input: '8.8.8.8', expected: false },
    { input: '1.1.1.1', expected: false },
    { input: null, expected: true },
  ];

  for (const test of tests) {
    const result = isPrivateIP(test.input);
    if (result !== test.expected) {
      console.log(`Expected ${test.expected}, got ${result} for input ${test.input}`);
      return false;
    }
  }
  return true;
}

// Testes para isValidEmail
function testIsValidEmail(): boolean {
  const tests = [
    { input: 'test@example.com', expected: true },
    { input: 'user.name@domain.co.uk', expected: true },
    { input: 'invalid-email', expected: false },
    { input: 'test@', expected: false },
    { input: '@domain.com', expected: false },
    { input: '', expected: false },
    { input: null, expected: false },
  ];

  for (const test of tests) {
    const result = isValidEmail(test.input);
    if (result !== test.expected) {
      console.log(`Expected ${test.expected}, got ${result} for input ${test.input}`);
      return false;
    }
  }
  return true;
}

// Testes para isValidBrazilianPhone
function testIsValidBrazilianPhone(): boolean {
  const tests = [
    { input: '11987654321', expected: true },
    { input: '1187654321', expected: true },
    { input: '(11) 98765-4321', expected: true },
    { input: '11 9 8765-4321', expected: true },
    { input: '123456789', expected: false },
    { input: '123456789012', expected: false },
    { input: '', expected: false },
    { input: null, expected: false },
  ];

  for (const test of tests) {
    const result = isValidBrazilianPhone(test.input);
    if (result !== test.expected) {
      console.log(`Expected ${test.expected}, got ${result} for input ${test.input}`);
      return false;
    }
  }
  return true;
}

// Executar todos os testes
export function runAllValidatorTests(): void {
  console.log('🧪 Executando testes de validadores...\n');
  
  runTest('normalizeBrazilianZipCode', testNormalizeBrazilianZipCode);
  runTest('isPrivateIP', testIsPrivateIP);
  runTest('isValidEmail', testIsValidEmail);
  runTest('isValidBrazilianPhone', testIsValidBrazilianPhone);
  
  console.log('\n✅ Testes de validadores concluídos!');
}

// Se executado diretamente
if (require.main === module) {
  runAllValidatorTests();
} 