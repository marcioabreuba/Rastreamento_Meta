/**
 * Definições de tipos para o projeto
 */

// Evento
export interface Event {
  id: string;
  eventName: string;
  eventTime: Date;
  userData?: any;
  customData?: any;
  serverData?: any;
  pixelSent: boolean;
  cAPIsSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dados do usuário
export interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  subscriptionId?: string;
  fbLoginId?: string;
  leadId?: string;
  language?: string;
  referrer?: string;
  // Novos parâmetros para Advanced Matching
  gender?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  // Parâmetros adicionais suportados pela API
  ctwaClid?: string; // Click ID para WhatsApp
  igAccountId?: string; // ID da conta Instagram
  igSid?: string; // ID de sessão do Instagram
  anonId?: string; // Para eventos de app
  madid?: string; // Mobile Advertiser ID
  vendorId?: string; // Identificador do dispositivo (iOS)
  // Novos parâmetros adicionais
  pageId?: string; // ID da página
  pageScopedUserId?: string; // ID do usuário no escopo da página
}

// Dados normalizados do usuário
export interface NormalizedUserData {
  em: string | null;
  ph: string | null;
  fn: string | null;
  ln: string | null;
  ge: string | null; // Gênero (hash)
  db: string | null; // Data de nascimento (hash)
  external_id: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  fbc: string | null;
  fbp: string | null;
  subscription_id: string | null;
  fb_login_id: string | null;
  lead_id: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  zip: string | null;
  // Novos parâmetros adicionais
  ctwa_clid: string | null; // Click ID para WhatsApp
  ig_account_id: string | null; // ID da conta Instagram
  ig_sid: string | null; // ID de sessão do Instagram
  anon_id: string | null; // Para eventos de app
  madid: string | null; // Mobile Advertiser ID (IDFA/AAID)
  vendor_id: string | null; // Vendor ID (iOS)
  page_id: string | null; // ID da página
  page_scoped_user_id: string | null; // ID do usuário no escopo da página
}

// Dados personalizados do evento
export interface CustomData {
  currency?: string;
  value?: number;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[] | string;
  contentType?: string;
  orderId?: string;
  numItems?: number;
  searchString?: string;
  status?: string;
  predictedLtv?: number;
  contents?: any[];
  sourceUrl?: string;
  referrer?: string;
  // Dados para eventos de rolagem
  scrollPercentage?: number;
  // Dados para eventos de vídeo 
  videoPercentage?: number;
  // Também permitir versões com underscore
  content_name?: string;
  content_category?: string;
  content_ids?: string[] | string;
  content_type?: string;
  order_id?: string;
  num_items?: number;
  search_string?: string;
  predicted_ltv?: number;
  // Campos para eventos de vídeo
  videoPosition?: number;
  videoDuration?: number;
  videoTitle?: string;
  video_position?: number;
  video_duration?: number;
  video_title?: string;
  // Novos campos para dados de aplicativo
  advertiserTrackingEnabled?: boolean;
  applicationTrackingEnabled?: boolean;
  extinfo?: any[];
  campaignIds?: string;
  installReferrer?: string;
  installerPackage?: string;
  urlSchemes?: string[];
  windowsAttributionId?: string;
}

// Dados normalizados personalizados
export interface NormalizedCustomData {
  currency: string;
  value: number;
  content_name: string | null;
  content_category: string | string[] | null;
  content_ids: string | string[] | null;
  content_type: string | null;
  order_id: string | null;
  num_items: number | null;
  search_string: string | null;
  status: string | null;
  predicted_ltv: number | null;
  contents: any[] | null;
  user_city?: string | null;
  user_state?: string | null;
  user_country?: string | null;
  user_zip?: string | null;
  geo_data?: GeoData | null;
  // Campos para eventos de vídeo
  video_position?: number | null;
  video_duration?: number | null;
  video_title?: string | null;
  // Parâmetros de app
  advertiser_tracking_enabled?: boolean | null;
  application_tracking_enabled?: boolean | null;
  extinfo?: any[] | null;
  campaign_ids?: string | null;
  install_referrer?: string | null;
  installer_package?: string | null;
  url_schemes?: string[] | null;
  windows_attribution_id?: string | null;
  [key: string]: any;
}

// Interface para segmentação de clientes
export interface CustomerSegmentation {
  priority_segment?: string | null;
  lifecycle_stage?: string | null;
  predicted_ltv_range?: string | null;
}

// Configurações de processamento de dados (para conformidade com LGPD, CCPA, etc.)
export interface DataProcessingOptions {
  options: string[];
  country?: number;
  state?: number;
}

// Dados do servidor
export interface ServerData {
  event_time: number;
  event_source_url: string;
  action_source: string;
  event_id: string;
  geo_data: GeoData | null;
  // Novos campos
  data_processing_options: string[];
  data_processing_options_country: number | null;
  data_processing_options_state: number | null;
  referrer_url: string | null;
  customer_segmentation: CustomerSegmentation | null;
}

// Dados normalizados do evento
export interface NormalizedEvent {
  eventName: string;
  userData: NormalizedUserData;
  customData: NormalizedCustomData;
  serverData: ServerData;
}

// Dados de requisição para rastreamento
export interface TrackRequest {
  eventName: string;
  userData?: UserData;
  customData?: CustomData;
  // Novos campos para processamento de dados e tipo de evento
  dataProcessingOptions?: string[];
  dataProcessingOptionsCountry?: number;
  dataProcessingOptionsState?: number;
  customerSegmentation?: CustomerSegmentation;
  isAppEvent?: boolean;
  isServerEvent?: boolean; // Indica se o evento foi gerado pelo servidor
}

// Dados de geolocalização
export interface GeoData {
  ip: string;
  isIPv6?: boolean; // Indica se é um IPv6 real ou não
  country?: {
    code: string;
    name: string;
  } | null;
  region?: {
    code: string;
    name: string;
  } | null;
  city?: string | null;
  postal?: string | null;
  location?: {
    latitude: number;
    longitude: number;
    accuracyRadius: number;
    timeZone: string;
  } | null;
} 