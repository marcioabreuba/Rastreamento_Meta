/**
 * Define a estrutura de parâmetros para eventos enviados via Meta CAPI (Server-Side).
 * Contém dados normalizados e hasheados conforme as especificações do Meta.
 */

/**
 * Dados do usuário normalizados e hasheados para CAPI.
 * IMPORTANTE: Os campos PII (em, ph, fn, ln, ge, db, city, state, zip, country)
 * devem ser hasheados usando SHA-256 após normalização.
 */
export interface ServerUserData {
  // --- Hashed Fields ---
  em?: string | null;      // Email (hashed)
  ph?: string | null;      // Telefone (hashed)
  fn?: string | null;      // Primeiro nome (hashed)
  ln?: string | null;      // Sobrenome (hashed)
  ge?: string | null;      // Gênero (hashed, 'f' ou 'm')
  db?: string | null;      // Data de nascimento (hashed, YYYYMMDD)
  ct?: string | null;      // Cidade (hashed)
  st?: string | null;      // Estado (sigla, hashed)
  zp?: string | null;      // CEP (hashed, normalizado para 8 dígitos no Brasil)
  country?: string | null; // País (sigla, hashed)
  external_id?: string | null; // ID do usuário (hashed)

  // --- Non-Hashed Fields ---
  client_ip_address?: string | null; // IP do cliente (IPv4 ou IPv6)
  client_user_agent?: string | null; // User Agent
  fbp?: string | null;               // Facebook Browser ID (Não hashear)
  fbc?: string | null;               // Facebook Click ID do cookie _fbc (Não hashear)
  fbclid?: string | null;            // Facebook Click ID da URL (Não hashear)
  subscription_id?: string | null;   // ID de assinatura
  fb_login_id?: string | null;       // ID de Login do Facebook
  lead_id?: string | null;           // ID de Lead
  // ... outros campos se necessário (ex: ctwa_clid, ig_account_id, etc.)
}

/**
 * Dados personalizados para CAPI.
 * Nomes de campos em snake_case.
 */
export interface ServerCustomData {
  value?: number | null;
  currency?: string | null; // ex: 'BRL'
  order_id?: string | null;
  num_items?: number | null;
  content_name?: string | null; // DEVE ser uma string única
  content_category?: string | null;
  content_ids?: string[] | null;
  content_type?: 'product' | 'product_group' | string | null;
  contents?: Array<{ id: string; quantity: number; item_price?: number }> | null;
  search_string?: string | null;
  status?: string | null;
  predicted_ltv?: number | null;
  // ... outros campos personalizados
}

/**
 * Estrutura completa do evento para a Meta CAPI.
 */
export interface ServerEvent {
  event_name: string;               // Nome do evento padrão do Meta (ex: 'Purchase')
  event_time: number;               // Timestamp Unix (segundos)
  event_source_url?: string | null;  // URL onde o evento ocorreu
  action_source: 'website' | 'app' | 'physical_store' | 'chat' | 'system_generated' | 'other'; // Origem da ação
  event_id?: string | null;          // ID único para desduplicação
  user_data: ServerUserData;        // Dados do usuário (hasheados/normalizados)
  custom_data?: ServerCustomData;    // Dados personalizados

  // Opcional: Controle de processamento de dados
  data_processing_options?: string[]; // ex: ['LDU']
  data_processing_options_country?: number; // 0 para não usar LDU
  data_processing_options_state?: number;   // 0 para não usar LDU

  // Opcional: Outros dados
  opt_out?: boolean;
  // ... outros campos de nível superior se necessário
} 