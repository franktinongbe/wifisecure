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

const app = express();
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) app.set('trust proxy', 1);

// Prisma returns BigInt for byte counters, which JSON.stringify cannot encode.
app.set('json replacer', (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value,
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(session({
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
  },
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/archives', archiveRoutes);
app.use('/api/news', newsRoutes);

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
