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

const app = express();
const PgSession = connectPgSimple(session);

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
    conString: env.directUrl, // ou process.env.DIRECT_URL si pas encore dans env.ts
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
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

app.listen(env.port, () => {
  console.log(`API WiFiSecure listening on port ${env.port}`);
});

export default app;
