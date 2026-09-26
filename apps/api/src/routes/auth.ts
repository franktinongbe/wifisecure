import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  organizationSlug: z.string().min(1).max(80).default('legacy'),
});

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Identifiants invalides.', errors: parsed.error.flatten() });
  }

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, organization: { slug: parsed.data.organizationSlug } } });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Identifiants incorrects.' });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Identifiants incorrects.' });
  }

  (req as any).session.user = { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId };

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  });
}));

router.post('/logout', async (req, res) => {
  req.session?.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la déconnexion.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Déconnexion réussie.' });
  });
});

router.get('/me', asyncHandler(async (req, res) => {
  const sessionUser = (req as any).session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: 'Non authentifié.' });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, organizationId: true, email: true, fullName: true, role: true, organization: { select: { name: true, slug: true } } },
  });

  if (!user) {
    return res.status(401).json({ message: 'Utilisateur non trouvé.' });
  }

  res.json({ user, networkAccess: (req as any).session?.networkAccess ?? null });
}));

// Simulates a captive-portal grant for local testing. It never routes real traffic.
router.post('/network/connect', requireAuth, requireRole('agent'), (req: AuthenticatedRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ message: 'La simulation du réseau est désactivée en production.' });
  }

  (req as any).session.networkAccess = {
    status: 'connected',
    mode: 'simulated',
    connectedAt: new Date().toISOString(),
  };
  return res.json({ status: 'connected', mode: 'simulated', internetAvailable: false });
});

export default router;
