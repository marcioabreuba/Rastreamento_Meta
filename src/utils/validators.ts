/**
 * Utilitários para validação e normalização de dados
 */

/**
 * Normaliza o CEP brasileiro para o formato padrão de 8 dígitos.
 * @param {string | null | undefined} zipCode - CEP a ser normalizado
 * @param {string | null | undefined} countryCode - Código do país
 * @returns {string | null} CEP normalizado ou o original se não for brasileiro
 */
export function normalizeBrazilianZipCode(zipCode: string | null | undefined, countryCode: string | null | undefined): string | null {
  if (!zipCode || !countryCode || countryCode.toLowerCase() !== 'br') {
    return zipCode || null;
  }

  const numericZip = zipCode.replace(/\D/g, '');
  
  // Se não tem dígitos, retorna null
  if (numericZip.length === 0) {
    return null;
  }
  
  // Se tem menos de 8 dígitos, completa com zeros à direita
  if (numericZip.length < 8) {
    return numericZip.padEnd(8, '0');
  }
  
  // Se tem exatamente 8 dígitos, retorna como está
  if (numericZip.length === 8) {
    return numericZip;
  }
  
  // Se tem mais de 8 dígitos, trunca para 8 (pega os primeiros 8)
  return numericZip.substring(0, 8);
}

/**
 * Valida se um IP é privado/local
 * @param {string | null} ip - Endereço IP
 * @returns {boolean} True se for IP privado/local
 */
export function isPrivateIP(ip: string | null): boolean {
  if (!ip) return true;
  
  return ip === '127.0.0.1' || 
         ip === 'localhost' || 
         ip.startsWith('192.168.') || 
         ip.startsWith('10.') ||
         ip.startsWith('172.16.') ||
         ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') ||
         ip.startsWith('172.19.') ||
         ip.startsWith('172.20.') ||
         ip.startsWith('172.21.') ||
         ip.startsWith('172.22.') ||
         ip.startsWith('172.23.') ||
         ip.startsWith('172.24.') ||
         ip.startsWith('172.25.') ||
         ip.startsWith('172.26.') ||
         ip.startsWith('172.27.') ||
         ip.startsWith('172.28.') ||
         ip.startsWith('172.29.') ||
         ip.startsWith('172.30.') ||
         ip.startsWith('172.31.');
}

/**
 * Valida formato de email básico
 * @param {string | null} email - Email a ser validado
 * @returns {boolean} True se formato válido
 */
export function isValidEmail(email: string | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de telefone brasileiro
 * @param {string | null} phone - Telefone a ser validado
 * @returns {boolean} True se formato válido
 */
export function isValidBrazilianPhone(phone: string | null): boolean {
  if (!phone) return false;
  const numericPhone = phone.replace(/\D/g, '');
  // Aceita 10 ou 11 dígitos (com ou sem 9 no celular)
  return numericPhone.length >= 10 && numericPhone.length <= 11;
} 