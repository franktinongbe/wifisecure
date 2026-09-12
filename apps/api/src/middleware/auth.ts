import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db.js';

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'agent';
  };
};

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sessionUser = (req as any).session?.user;

    if (!sessionUser) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Session invalide.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role: 'admin' | 'agent') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Authentification requise.' });
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    next();
  };
}