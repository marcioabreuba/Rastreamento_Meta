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
}

// Dados normalizados do usuário
export interface NormalizedUserData {
  em: string | null;
  ph: string | null;
  fn: string | null;
  ln: string | null;
  external_id: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  fbc: string | null;
  fbp: string | null;
  subscription_id: string | null;
  fb_login_id: string | null;
  lead_id: string | null;
  country: string | null;
  state?: string | null;
  city: string | null;
  zip: string | null;
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
}

// Dados normalizados personalizados
export interface NormalizedCustomData {
  currency: string;
  value: number;
  content_name: string | null;
  content_category: string | null;
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
  [key: string]: any;
}

// Dados do servidor
export interface ServerData {
  event_time: number;
  event_source_url: string;
  action_source: string;
  event_id: string;
  geo_data: GeoData | null;
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
}

// Dados de geolocalização
export interface GeoData {
  ip: string;
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