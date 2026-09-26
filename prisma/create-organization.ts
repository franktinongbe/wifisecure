import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

const required = ['ORG_SLUG', 'ORG_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME'] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Define these environment variables first: ${missing.join(', ')}`);

const slug = process.env.ORG_SLUG!.trim().toLowerCase();
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === 'legacy') throw new Error('ORG_SLUG must be a lowercase slug, and cannot be legacy.');
if (process.env.ADMIN_PASSWORD!.length < 10) throw new Error('ADMIN_PASSWORD must contain at least 10 characters.');

const prisma = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);
  const ingestToken = randomBytes(32).toString('base64url');
  const ingestTokenHash = createHash('sha256').update(ingestToken).digest('hex');
  const organization = await prisma.organization.create({
    data: {
      slug,
      name: process.env.ORG_NAME!.trim(),
      ingestTokenHash,
      users: { create: { email: process.env.ADMIN_EMAIL!.trim().toLowerCase(), fullName: process.env.ADMIN_NAME!.trim(), passwordHash, role: 'admin' } },
    },
    select: { id: true, slug: true, name: true },
  });
  console.log(`Created ${organization.name} (${organization.slug}) with its first administrator.`);
  console.log(`Collector token (save this now): ${ingestToken}`);
} finally {
  await prisma.$disconnect();
}
