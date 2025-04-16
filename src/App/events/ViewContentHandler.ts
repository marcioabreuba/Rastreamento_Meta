import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento ViewContent (ou mapeados como ViewHome, ViewList, ViewCategory).
 */
export interface ViewContentEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento ViewContent a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @param originalEventName O nome original do evento.
 * @returns {ViewContentEventData} Dados específicos do evento ViewContent.
 */
export function handleViewContent(rawUserData: any = {}, rawCustomData: any = {}, originalEventName?: string): ViewContentEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData específicos (se houver)
  };

  const specificCustomData: Partial<WebCustomData> = {
    content_name: rawCustomData.content_name || rawCustomData.contentName || document.title || null,
    content_category: rawCustomData.content_category || rawCustomData.contentCategory || null,
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    // Default 'product' se tiver IDs, senão pode ser outro tipo
    content_type: rawCustomData.content_type || rawCustomData.contentType || (rawCustomData.content_ids ? 'product' : 'page'),
    value: rawCustomData.value !== undefined ? Number(rawCustomData.value) : null,
    currency: rawCustomData.currency || 'BRL', // Default BRL
    // Para ViewHome/ViewCategory, podemos ter lógicas adicionais aqui para preencher
    // content_name/category se não vierem explicitamente.
    // Mas isso pode ser feito antes de chamar o handler, no TrackController.
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