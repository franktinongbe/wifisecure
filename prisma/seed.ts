import { PrismaClient, Role, SessionStatus, AlertType, AlertStatus } from '@prisma/client';
import { seedUsers, seedBlockedDomains, seedSettings } from './seed-data.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding de la base de données...');

  // 1. Nettoyage de la base de données
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blockedDomain.deleteMany();
  await prisma.setting.deleteMany();

  // 2. Insérer les utilisateurs
  console.log('Création des utilisateurs...');
  const users = await Promise.all(
    seedUsers.map((user) => prisma.user.create({ data: user }))
  );

  const adminUser = users.find((u) => u.role === Role.admin)!;

  // 3. Insérer les domaines bloqués
  console.log('Création des domaines bloqués...');
  await Promise.all(
    seedBlockedDomains.flatMap((domain) => [
      prisma.blockedDomain.create({ data: { ...domain, role: Role.agent } }),
      prisma.blockedDomain.create({ data: { ...domain, role: Role.admin } }),
    ])
  );

  // 4. Insérer les paramètres système
  console.log('Création des paramètres...');
  await Promise.all(
    seedSettings.map((setting) => prisma.setting.create({ data: setting }))
  );

  // 5. Insérer des sessions de démonstration et leurs alertes
  console.log('Création des sessions et des alertes...');

  // Session 1 : Domaine bloqué déclenché
  const session1 = await prisma.session.create({
    data: {
      identifiantUsager: 'U-011',
      appareil: 'PC-POSTE-04',
      debut: new Date(Date.now() - 30 * 60 * 1000), // Il y a 30 minutes
      volumeOctets: BigInt(1250000000), // ~1.25 Go
      domaineDns: 'youtube.com',
      status: SessionStatus.needs_review,
    },
  });

  await prisma.alert.create({
    data: {
      sessionId: session1.id,
      type: AlertType.domaine_bloque,
      status: AlertStatus.active,
      message: 'Tentative d\'accès à un domaine bloqué (youtube.com)',
    },
  });

  // Session 2 : Volume élevé déclenché
  const session2 = await prisma.session.create({
    data: {
      identifiantUsager: 'U-003',
      appareil: 'SMARTPHONE-WIFI',
      debut: new Date(Date.now() - 60 * 60 * 1000), // Il y a 1 heure
      volumeOctets: BigInt(4500000000), // ~4.5 Go
      domaineDns: null,
      status: SessionStatus.needs_review,
    },
  });

  await prisma.alert.create({
    data: {
      sessionId: session2.id,
      type: AlertType.volume_eleve,
      status: AlertStatus.active,
      message: 'Consommation de données anormalement élevée (> 1 Go)',
    },
  });

  // Session 3 : Alerte déjà résolue
  const session3 = await prisma.session.create({
    data: {
      identifiantUsager: 'U-018',
      appareil: 'TABLETTE-02',
      debut: new Date(Date.now() - 120 * 60 * 1000),
      fin: new Date(Date.now() - 15 * 60 * 1000),
      volumeOctets: BigInt(350000000),
      domaineDns: 'facebook.com',
      status: SessionStatus.normal,
    },
  });

  await prisma.alert.create({
    data: {
      sessionId: session3.id,
      type: AlertType.domaine_bloque,
      status: AlertStatus.resolved,
      message: 'Accès bloqué vers facebook.com',
      resolvedAt: new Date(),
      resolvedBy: adminUser.email,
    },
  });

  // 6. Insérer un journal d'audit
  console.log('Création du journal d\'audit...');
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      action: 'RESOLVE_ALERT',
      details: `Alerte résolue par ${adminUser.fullName} pour la session ${session3.id}`,
    },
  });

  console.log('✅ Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
