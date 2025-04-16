import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento InitiateCheckout.
 */
export interface InitiateCheckoutEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento InitiateCheckout a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @param originalEventName Nome do evento original.
 * @returns {InitiateCheckoutEventData} Dados específicos do evento InitiateCheckout.
 */
export function handleInitiateCheckout(rawUserData: any = {}, rawCustomData: any = {}, originalEventName?: string): InitiateCheckoutEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData específicos (se houver)
  };

  const specificCustomData: Partial<WebCustomData> = {
    value: rawCustomData.value !== undefined ? Number(rawCustomData.value) : null,
    currency: rawCustomData.currency || 'BRL',
    num_items: rawCustomData.num_items || rawCustomData.numItems || null,
    // content_name será tratado no NormalizationService se for array
    content_name: rawCustomData.content_name || rawCustomData.contentName || null,
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    content_type: rawCustomData.content_type || rawCustomData.contentType || 'product_group', // Default product_group for checkout
    contents: rawCustomData.contents || null,
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