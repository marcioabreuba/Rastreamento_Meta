import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento CompleteRegistration.
 */
export interface CompleteRegistrationEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento CompleteRegistration a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @param originalEventName Nome do evento original.
 * @returns {CompleteRegistrationEventData} Dados específicos do evento CompleteRegistration.
 */
export function handleCompleteRegistration(rawUserData: any = {}, rawCustomData: any = {}, originalEventName?: string): CompleteRegistrationEventData {
  const specificUserData: Partial<WebUserData> = {
    // Dados PII (em, ph, fn, ln) são geralmente enviados aqui e tratados no NormalizationService
  };

  const specificCustomData: Partial<WebCustomData> = {
    currency: rawCustomData.currency || 'BRL',
    status: rawCustomData.status || 'completed', // Status do registro
    content_name: rawCustomData.content_name || rawCustomData.contentName || 'Registration',
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