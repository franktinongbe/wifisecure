import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const SALT_ROUNDS = 10;

export async function createUser(organizationId: string, email: string, password: string, fullName: string, role: 'admin' | 'agent' = 'agent') {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: { organizationId, email, passwordHash, fullName, role },
    select: { id: true, organizationId: true, email: true, fullName: true, role: true, createdAt: true },
  });
}

export async function verifyLogin(organizationSlug: string, email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email, organization: { slug: organizationSlug } } });
  if (!user || !user.isActive) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
