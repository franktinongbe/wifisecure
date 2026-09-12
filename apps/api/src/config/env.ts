import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  sessionSecret: process.env.SESSION_SECRET ?? 'development-secret',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  directUrl: process.env.DIRECT_URL ?? 'postgresql://wifisecure:wifisecure@localhost:5432/wifisecure?schema=public',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
};