import type { RequestHandler } from 'express';

const windowMs = 15 * 60 * 1000;
const maxAttempts = 10;
const maxTrackedIps = 10_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export const loginRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  if (entry.count >= maxAttempts) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ message: 'Trop de tentatives. Réessayez plus tard.' });
  }

  entry.count += 1;
  attempts.set(key, entry);

  if (attempts.size > maxTrackedIps) {
    for (const [ip, record] of attempts) {
      if (record.resetAt <= now) attempts.delete(ip);
    }
    while (attempts.size > maxTrackedIps) {
      const oldest = attempts.keys().next().value;
      if (oldest === undefined) break;
      attempts.delete(oldest);
    }
  }

  next();
};
