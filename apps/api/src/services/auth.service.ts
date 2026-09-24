import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';

const SALT_ROUNDS = 10;

export async function createUser(email: string, password: string, fullName: string, role: 'admin' | 'agent' = 'agent') {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.user.create({
    data: { email, passwordHash, fullName, role },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
  });
}

export async function verifyLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
