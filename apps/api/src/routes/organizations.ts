import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { asyncHandler } from '../lib/async-handler.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const createOrganizationSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(100),
  label: z.string().trim().max(120).default('Portail de connexion Wi-Fi'),
  admin: z.object({ fullName: z.string().trim().min(2).max(120), email: z.string().email(), password: z.string().min(8) }),
  agent: z.object({ fullName: z.string().trim().min(2).max(120), email: z.string().email(), password: z.string().min(8) }),
}).refine((data) => data.admin.email.toLowerCase() !== data.agent.email.toLowerCase(), {
  message: 'Les comptes administrateur et agent doivent avoir des adresses e-mail différentes.',
});

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = createOrganizationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Vérifiez les informations de la structure et de ses comptes.', errors: parsed.error.flatten() });

  const [adminPasswordHash, agentPasswordHash] = await Promise.all([
    bcrypt.hash(parsed.data.admin.password, 12),
    bcrypt.hash(parsed.data.agent.password, 12),
  ]);
  const collectorToken = randomBytes(32).toString('base64url');
  const ingestTokenHash = createHash('sha256').update(collectorToken).digest('hex');

  try {
    const organization = await prisma.organization.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        label: parsed.data.label,
        ingestTokenHash,
        users: {
          create: [
            { fullName: parsed.data.admin.fullName, email: parsed.data.admin.email.toLowerCase(), passwordHash: adminPasswordHash, role: 'admin' },
            { fullName: parsed.data.agent.fullName, email: parsed.data.agent.email.toLowerCase(), passwordHash: agentPasswordHash, role: 'agent' },
          ],
        },
      },
      select: { id: true, slug: true, name: true, label: true },
    });
    return res.status(201).json({ organization, collectorToken });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return res.status(409).json({ message: 'Ce code de structure existe déjà.' });
    throw error;
  }
}));

export default router;
