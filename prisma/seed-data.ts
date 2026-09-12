import { Role } from '@prisma/client';

export const seedUsers = [
  {
    email: 'admin@wifisecure.local',
    passwordHash: '$2a$10$ive9A.ZyVc0in2/rThf0eeTBbi5Oh16rgmc9/Ujf5iRkM.2BDBO4y', // admin123
    fullName: 'Administrateur Système',
    role: Role.admin,
    isActive: true,
  },
  {
    email: 'agent.bibliotheque@wifisecure.local',
    passwordHash: '$2a$10$qfZGv/x04NpTbdLwxVIvBO7O7OyewoUeRwrhY/ebHn8fIumahUFDm', // agent123
    fullName: 'Agent d\'accueil',
    role: Role.agent,
    isActive: true,
  },
];

export const seedBlockedDomains = [
  { domain: 'youtube.com', active: true, updatedBy: 'admin@wifisecure.local' },
  { domain: 'facebook.com', active: true, updatedBy: 'admin@wifisecure.local' },
  { domain: 'tiktok.com', active: true, updatedBy: 'admin@wifisecure.local' },
];

export const seedSettings = [
  { key: 'SEUIL_VOLUME_OCTETS_MB', value: '1000' },
  { key: 'DUREE_MAX_SESSION_MINUTES', value: '120' },
];