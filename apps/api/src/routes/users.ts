import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userSelect,
  });

  res.json(users);
}));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['admin', 'agent']),
});

const sharedAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

// A single shared login for Wi-Fi users. Admin accounts remain individual.
router.put('/shared-account', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const parsed = sharedAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const existing = await prisma.user.findFirst({ where: { role: 'agent', isActive: true }, select: { id: true } });
  try {
    const account = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { email: parsed.data.email, fullName: parsed.data.fullName, passwordHash, isActive: true },
          select: userSelect,
        })
      : await prisma.user.create({
          data: {
            email: parsed.data.email,
            fullName: parsed.data.fullName,
            passwordHash,
            role: 'agent',
          },
          select: userSelect,
        });
    return res.json(account);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Cet identifiant est déjà utilisé.' });
    }
    throw err;
  }
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  if (parsed.data.role === 'agent') {
    return res.status(409).json({ message: 'Le compte utilisateur est partagé. Utilisez la modification des identifiants partagés.' });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
      },
      select: userSelect,
    });

    res.status(201).json(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet e-mail.' });
    }
    throw err;
  }
}));

router.patch('/:id/deactivate', requireAuth, requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (req.user?.id === userId) {
    return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: userSelect,
    });
    res.json(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    throw err;
  }
}));

export default router;
