import { WebUserData, WebCustomData } from '../Model/WebEventParams';

/**
 * Dados para eventos genéricos que não possuem muitos campos específicos
 * ou cujos campos são diretamente passados para customData.
 */
export interface GenericEventData {
  userData: Partial<WebUserData>;
  customData: Partial<WebCustomData>;
}

/**
 * Manipulador genérico para eventos que não requerem extração complexa.
 * Ele basicamente repassa os dados brutos para serem processados pelo NormalizationService.
 * Pode ser usado para PageView, ViewHome, ViewCart, ViewCategory, Timer, Scroll, etc.
 * @param rawUserData Dados brutos do usuário da requisição.
 * @param rawCustomData Dados brutos personalizados da requisição.
 * @param originalEventName O nome original do evento.
 * @returns {GenericEventData} Dados brutos para processamento posterior.
 */
export function handleGenericEvent(rawUserData: any = {}, rawCustomData: any = {}, originalEventName?: string): GenericEventData {
  // Neste handler, não extraímos nada de muito específico.
  // Apenas garantimos que a estrutura básica seja retornada.
  const specificUserData: Partial<WebUserData> = {
    // Repassa quaisquer dados de usuário recebidos
    ...rawUserData
  };

  const specificCustomData: Partial<WebCustomData> = {
    // Repassa quaisquer dados customizados recebidos
    ...rawCustomData
  };

  // Uma lógica específica mínima poderia ser garantir um content_type padrão para PageView
  // if (eventName === 'PageView') {
  //   specificCustomData.content_type = specificCustomData.content_type || 'page';
  // }

  return {
    userData: specificUserData,
    customData: specificCustomData,
  };
} 