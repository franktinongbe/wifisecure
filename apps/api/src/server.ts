import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env } from './config/env.js';
import sessionRoutes from './routes/sessions.js';
import statsRoutes from './routes/stats.js';
import alertRoutes from './routes/alerts.js';
import settingRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import exportRoutes from './routes/export.js';
import blockRoutes from './routes/blocks.js';
import archiveRoutes from './routes/archives.js';
import { startDailyArchiveScheduler } from './services/archiveService.js';
import newsRoutes from './routes/news.js';
import organizationRoutes from './routes/organizations.js';
import unifiClientRoutes from './routes/unifiClients.js';

const app = express();
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set(env.frontendOrigins);

app.disable('x-powered-by');

if (isProduction) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const origin = req.header('origin');
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (isMutation && origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ message: 'Origine de requête refusée.' });
  }
  next();
});

// Prisma returns BigInt for byte counters, which JSON.stringify cannot encode.
app.set('json replacer', (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value,
);

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  name: isProduction ? '__Host-wifisecure.sid' : 'connect.sid',
  store: new PgSession({
    conString: env.sessionDatabaseUrl,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/archives', archiveRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/unifi', unifiClientRoutes);

// Keep database/session failures visible in server logs while returning a
// stable JSON response to clients. Never include connection strings here.
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API request failed', {
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
  });
  if (res.headersSent) return;
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

app.listen(env.port, () => {
  console.log(`API WiFiSecure listening on port ${env.port}`);
  startDailyArchiveScheduler();
});

export default app;
