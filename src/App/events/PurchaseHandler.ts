import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento Purchase.
 */
export interface PurchaseEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento Purchase a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @returns {PurchaseEventData} Dados específicos do evento Purchase.
 */
export function handlePurchase(rawUserData: any = {}, rawCustomData: any = {}): PurchaseEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData relevantes especificamente para Purchase (se houver)
    // Normalmente, a maioria dos dados de usuário é genérica e tratada
    // pelo NormalizationService, mas poderíamos extrair algo específico aqui se necessário.
  };

  const specificCustomData: Partial<WebCustomData> = {
    order_id: rawCustomData.order_id || rawCustomData.orderId || null,
    value: rawCustomData.value !== undefined ? Number(rawCustomData.value) : null,
    currency: rawCustomData.currency || 'BRL', // Default BRL
    num_items: rawCustomData.num_items || rawCustomData.numItems || null,
    contents: rawCustomData.contents || null,
    // content_name será tratado no NormalizationService se for array
    content_name: rawCustomData.content_name || rawCustomData.contentName || null,
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    content_type: rawCustomData.content_type || rawCustomData.contentType || 'product_group', // Default product_group for purchase
  };

  // Remover nulos/undefined para limpeza (opcional aqui, NormalizationService também faz)
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