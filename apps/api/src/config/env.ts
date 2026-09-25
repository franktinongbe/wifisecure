import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  sessionSecret: process.env.SESSION_SECRET ?? 'development-secret',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  directUrl: process.env.DIRECT_URL ?? 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  // Use the same reachable runtime endpoint as Prisma unless a dedicated
  // session connection is configured (for example, a non-pooled Postgres URL).
  sessionDatabaseUrl: process.env.SESSION_DATABASE_URL || process.env.DATABASE_URL || process.env.DIRECT_URL || 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  wifiIngestToken: process.env.WIFI_INGEST_TOKEN ?? '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  whatsappAdminPhone: process.env.WHATSAPP_ADMIN_PHONE ?? '',
  whatsappGraphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? '',
  whatsappAlertTemplate: process.env.WHATSAPP_ALERT_TEMPLATE ?? '',
  whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'fr',
  unifiApiBaseUrl: process.env.UNIFI_API_BASE_URL ?? '',
  unifiApiKey: process.env.UNIFI_API_KEY ?? '',
  unifiSiteId: process.env.UNIFI_SITE_ID ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? '',
  supabaseArchiveBucket: process.env.SUPABASE_ARCHIVE_BUCKET ?? 'connection-archives',
  supabaseNewsBucket: process.env.SUPABASE_NEWS_BUCKET ?? 'library-news',
};
