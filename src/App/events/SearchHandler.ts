import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados específicos extraídos para um evento Search.
 */
export interface SearchEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Extrai dados específicos para o evento Search a partir dos dados brutos.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @returns {SearchEventData} Dados específicos do evento Search.
 */
export function handleSearch(rawUserData: any = {}, rawCustomData: any = {}): SearchEventData {
  const specificUserData: Partial<WebUserData> = {
    // Campos de UserData específicos (se houver)
  };

  const specificCustomData: Partial<WebCustomData> = {
    search_string: rawCustomData.search_string || rawCustomData.searchString || null,
    // Outros dados como content_ids (resultados) podem ser adicionados se disponíveis
    content_ids: rawCustomData.content_ids || rawCustomData.contentIds || null,
    content_category: rawCustomData.content_category || rawCustomData.contentCategory || null,
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