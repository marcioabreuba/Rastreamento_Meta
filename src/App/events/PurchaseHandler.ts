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
 * @param originalEventName Nome do evento original (ex: Purchase, Purchase_pix).
 * @returns {PurchaseEventData} Dados específicos do evento Purchase.
 */
export function handlePurchase(rawUserData: any = {}, rawCustomData: any = {}, originalEventName: string = 'Purchase'): PurchaseEventData {
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

  // --- ETAPA 3: Extrair payment_method do nome original do evento ---
  let paymentMethod: string | null = null;
  const nameLower = originalEventName.toLowerCase(); // Normalizar para minúsculas

  if (nameLower.includes('_pix') || nameLower.includes('- pix')) {
      paymentMethod = 'pix';
  } else if (nameLower.includes('_credit_card') || nameLower.includes('cartao')) { 
      paymentMethod = 'credit_card';
  } else if (nameLower.includes('_billet') || nameLower.includes('boleto')) { 
      paymentMethod = 'billet';
  } else if (nameLower.includes('_high_ticket')) {
       paymentMethod = 'high_ticket';
  } else if (nameLower === 'purchase') {
      // Se for apenas 'Purchase', talvez seja um método não especificado ou padrão
      paymentMethod = 'unknown'; // Ou pode ser null
  }
  // Adicionar mais lógicas se houver outros padrões de nome

  // Adicionar ao customData SE um método foi identificado
  if (paymentMethod) {
      specificCustomData.payment_method = paymentMethod;
  }
  // --- FIM DA ETAPA 3 ---

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