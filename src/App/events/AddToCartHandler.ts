import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento AddToCart.
 */
export interface AddToCartEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento AddToCart a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @param originalEventName Nome do evento original.
 * @returns {AddToCartEventData} Dados específicos do evento AddToCart.
 */
export function handleAddToCart(rawUserData: any = {}, rawCustomData: any = {}, originalEventName?: string): AddToCartEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData específicos (se houver)
  };

  const specificCustomData: Partial<WebCustomData> = {
    value: rawCustomData.value !== undefined ? Number(rawCustomData.value) : null, // Valor total do item/carrinho adicionado
    currency: rawCustomData.currency || 'BRL',
    // content_name será tratado no NormalizationService se for array
    content_name: rawCustomData.content_name || rawCustomData.contentName || null,
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    content_type: rawCustomData.content_type || rawCustomData.contentType || (rawCustomData.content_ids?.length > 1 ? 'product_group' : 'product'), // product ou product_group
    contents: rawCustomData.contents || null, // Detalhes dos itens adicionados
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