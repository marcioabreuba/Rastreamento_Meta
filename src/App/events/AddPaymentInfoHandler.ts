import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento AddPaymentInfo.
 */
export interface AddPaymentInfoEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento AddPaymentInfo a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @returns {AddPaymentInfoEventData} Dados específicos do evento AddPaymentInfo.
 */
export function handleAddPaymentInfo(rawUserData: any = {}, rawCustomData: any = {}): AddPaymentInfoEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData específicos (se houver)
  };

  const specificCustomData: Partial<WebCustomData> = {
    value: rawCustomData.value !== undefined ? Number(rawCustomData.value) : null,
    currency: rawCustomData.currency || 'BRL',
    num_items: rawCustomData.num_items || rawCustomData.numItems || null,
    content_name: rawCustomData.content_name || rawCustomData.contentName || null,
    content_category: rawCustomData.content_category || rawCustomData.contentCategory || null,
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    content_type: rawCustomData.content_type || rawCustomData.contentType || 'product_group', // Default product_group
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