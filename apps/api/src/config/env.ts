import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET ?? '';
const wifiIngestToken = process.env.WIFI_INGEST_TOKEN ?? '';
const unifiInsecureTls = process.env.UNIFI_INSECURE_TLS === 'true';
const frontendUrl = process.env.FRONTEND_URL ?? '';
const frontendOrigins = frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction) {
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
  }
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error('DATABASE_URL and DIRECT_URL are required in production.');
  }
  if (!wifiIngestToken || wifiIngestToken.length < 32) {
    throw new Error('WIFI_INGEST_TOKEN must contain at least 32 characters in production.');
  }
  if (!frontendOrigins.length || frontendOrigins.some((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol !== 'https:' &&
        !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname));
    } catch {
      return true;
    }
  })) {
    throw new Error('FRONTEND_URL must contain HTTPS origins (HTTP is allowed only on loopback) in production.');
  }
  if (!process.env.UNIFI_API_BASE_URL || !process.env.UNIFI_API_KEY || !process.env.UNIFI_SITE_ID) {
    throw new Error('UNIFI_API_BASE_URL, UNIFI_API_KEY and UNIFI_SITE_ID are required in production.');
  }
  if (unifiInsecureTls) {
    throw new Error('UNIFI_INSECURE_TLS cannot be enabled in production.');
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  sessionSecret: sessionSecret || 'development-only-session-secret-change-me',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  directUrl: process.env.DIRECT_URL ?? 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  // Express sessions require a persistent connection. Prefer the direct or
  // session-mode pooler URL over DATABASE_URL, which may use transaction mode.
  sessionDatabaseUrl: process.env.SESSION_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  frontendOrigins: frontendOrigins.length ? frontendOrigins : ['http://localhost:3000'],
  wifiIngestToken,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  whatsappAdminPhone: process.env.WHATSAPP_ADMIN_PHONE ?? '',
  whatsappGraphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? '',
  whatsappAlertTemplate: process.env.WHATSAPP_ALERT_TEMPLATE ?? '',
  whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'fr',
  unifiApiBaseUrl: process.env.UNIFI_API_BASE_URL ?? '',
  unifiApiKey: process.env.UNIFI_API_KEY ?? '',
  unifiSiteId: process.env.UNIFI_SITE_ID ?? '',
  unifiCaCertPath: process.env.UNIFI_CA_CERT_PATH ?? '',
  unifiInsecureTls,
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? '',
  supabaseArchiveBucket: process.env.SUPABASE_ARCHIVE_BUCKET ?? 'connection-archives',
  supabaseNewsBucket: process.env.SUPABASE_NEWS_BUCKET ?? 'library-news',
};
