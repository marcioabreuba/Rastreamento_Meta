/**
 * Configurações globais do aplicativo
 */

import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

interface Config {
  nodeEnv: string;
  logLevel: string;
  port: number;
  databaseUrl: string;
  fbApiUrl: string;
  fbPixelId: string;
  fbAccessToken: string;
  fbTestEventCode: string;
  shopifyDomain: string;
  renderExternalUrl: string;
  geoipDbPath: string;
  maxmindAccountId: string;
  maxmindLicenseKey: string;
  redis: {
    host: string;
    port: number;
    password: string | null;
    username: string | null;
    databaseName: string;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  fbApiUrl: process.env.FB_API_URL || 'https://graph.facebook.com/v18.0',
  fbPixelId: process.env.FB_PIXEL_ID || '1163339595278098',
  fbAccessToken: process.env.FB_ACCESS_TOKEN || '',
  fbTestEventCode: process.env.FB_TEST_EVENT_CODE || '',
  shopifyDomain: process.env.SHOPIFY_DOMAIN || 'soleterra.com.br',
  renderExternalUrl: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001',
  geoipDbPath: process.env.GEOIP_DB_PATH || 'data/GeoLite2-City.mmdb',
  maxmindAccountId: process.env.MAXMIND_ACCOUNT_ID || '',
  maxmindLicenseKey: process.env.MAXMIND_LICENSE_KEY || '',
  redis: {
    host: process.env.REDIS_HOST || 'redis-17623.c74.us-east-1-4.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT || '17623', 10),
    password: process.env.REDIS_PASSWORD || 'TGT9TZNhbBTr0mlmpFlCFQMVKqJAXOoB',
    username: process.env.REDIS_USERNAME || 'default',
    databaseName: process.env.REDIS_DATABASE_NAME || 'database-M970R9HC'
  }
};

export default config; 