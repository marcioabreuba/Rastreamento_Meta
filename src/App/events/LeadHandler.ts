import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento Lead.
 */
export interface LeadEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento Lead a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @returns {LeadEventData} Dados específicos do evento Lead.
 */
export function handleLead(rawUserData: any = {}, rawCustomData: any = {}): LeadEventData {
  const specificUserData: Partial<WebUserData> = {
    // Dados PII (em, ph, fn, ln) são geralmente enviados aqui e tratados no NormalizationService
  };

  const specificCustomData: Partial<WebCustomData> = {
    content_name: rawCustomData.content_name || rawCustomData.contentName || 'Lead Form', // Default name
    content_category: rawCustomData.content_category || rawCustomData.contentCategory || 'Lead', // Default category
    status: rawCustomData.status || null, // Status do lead (ex: 'submitted')
    // value e currency podem ser usados para leads qualificados
    value: rawCustomData.value !== undefined ? Number(rawCustomData.value) : null,
    currency: rawCustomData.currency || 'BRL',
  };

  // Remover nulos/undefined
  Object.keys(specificCustomData).forEach(key => {
    // @ts-ignore
    if (specificCustomData[key] === null || specificCustomData[key] === undefined) {
         // @ts-ignore
        delete specificCustomData[key];
    }
  });

  return {
    userData: specificUserData,
    customData: specificCustomData,
  };
} 