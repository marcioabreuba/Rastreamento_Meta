/**
 * Define a estrutura de parâmetros para eventos enviados via fbq() no navegador.
 * Estes parâmetros geralmente NÃO são hasheados pelo script cliente,
 * pois o próprio pixel do Facebook pode fazer o hashing necessário.
 */

export interface WebUserData {
  // Identificadores (geralmente não hasheados no 'init')
  external_id?: string | null; // ID do usuário no sistema cliente
  em?: string | null;          // Email
  ph?: string | null;          // Telefone (sem formatação)
  fn?: string | null;          // Primeiro nome
  ln?: string | null;          // Sobrenome
  ge?: string | null;          // Gênero ('f' ou 'm')
  db?: string | null;          // Data de nascimento (YYYYMMDD)
  ct?: string | null;          // Cidade (sem hash)
  st?: string | null;          // Estado (sigla, sem hash)
  zp?: string | null;          // CEP (sem hash, normalizado para Brasil)
  country?: string | null;     // País (sigla, sem hash)

  // Parâmetros de contexto (essenciais para correspondência)
  client_user_agent?: string | null; // User Agent do navegador
  fbp?: string | null;               // Facebook Browser ID (ex: fb.1.1558571054389.1098115397)
  fbc?: string | null;               // Facebook Click ID (ex: fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz)
}

export interface WebCustomData {
  // Parâmetros de Compra
  value?: number | null;
  currency?: string | null; // ex: 'BRL'
  order_id?: string | null;
  num_items?: number | null;

  // Conteúdo
  content_name?: string | null; // Pode ser um array de nomes no carrinho, tratado antes de enviar
  content_category?: string | null;
  content_ids?: string[] | null; // Array de SKUs ou IDs
  content_type?: 'product' | 'product_group' | 'page_view' | string | null; // 'product' para item, 'product_group' para múltiplos
  contents?: Array<{ id: string; quantity: number; item_price?: number }> | null;

  // Outros Parâmetros
  search_string?: string | null;
  status?: string | null; // ex: status de lead
  predicted_ltv?: number | null;

  // Parâmetros de Contexto Adicionais
  language?: string | null; // ex: 'pt-BR'
  referrer?: string | null; // URL de referência
  app?: string | null;      // Identificador da aplicação (ex: 'meta-tracking')
  sourceUrl?: string | null;// URL da página atual
}

export interface WebEventParams {
  eventName: string;      // Nome do evento (ex: 'Purchase', 'ViewContent')
  userData?: WebUserData;
  customData?: WebCustomData;
} 