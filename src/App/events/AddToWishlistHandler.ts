import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento AddToWishlist.
 */
export interface AddToWishlistEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento AddToWishlist a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @returns {AddToWishlistEventData} Dados específicos do evento AddToWishlist.
 */
export function handleAddToWishlist(rawUserData: any = {}, rawCustomData: any = {}): AddToWishlistEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData específicos (se houver)
  };

  const specificCustomData: Partial<WebCustomData> = {
    // content_name será tratado no NormalizationService se for array
    content_name: rawCustomData.content_name || rawCustomData.contentName || null,
    content_category: rawCustomData.content_category || rawCustomData.contentCategory || null,
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    content_type: rawCustomData.content_type || rawCustomData.contentType || (rawCustomData.content_ids?.length > 1 ? 'product_group' : 'product'),
    contents: rawCustomData.contents || null,
    // Value e currency podem opcionalmente ser adicionados se fizer sentido
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