BEGIN;

-- Create the legacy tenant first so every existing row remains accessible.
CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "label" VARCHAR(120) NOT NULL DEFAULT 'Portail de connexion Wi-Fi',
  "contactEmail" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "logoUrl" TEXT NOT NULL DEFAULT '',
  "primaryColor" VARCHAR(7) NOT NULL DEFAULT '#2148a6',
  "ingestTokenHash" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

INSERT INTO "organizations" ("id", "slug", "name", "label", "contactEmail", "phone", "address", "logoUrl", "primaryColor", "updatedAt")
SELECT '00000000-0000-4000-8000-000000000001', 'legacy',
  COALESCE(NULLIF(profile.value::jsonb->>'name', ''), 'WiFiSecure'),
  COALESCE(NULLIF(profile.value::jsonb->>'label', ''), 'Portail de connexion Wi-Fi'),
  COALESCE(profile.value::jsonb->>'contactEmail', ''), COALESCE(profile.value::jsonb->>'phone', ''),
  COALESCE(profile.value::jsonb->>'address', ''), COALESCE(profile.value::jsonb->>'logoUrl', ''),
  COALESCE(profile.value::jsonb->>'primaryColor', '#2148a6'), CURRENT_TIMESTAMP
FROM (SELECT 1) seed
LEFT JOIN "settings" profile ON profile."key" = 'organization_profile';

ALTER TABLE "users" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "sessions" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "actualites_bibliotheque" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "appareils_bloques" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "domaines_bloques" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "settings" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "organizationId" TEXT;

UPDATE "users" SET "organizationId" = '00000000-0000-4000-8000-000000000001';
UPDATE "sessions" SET "organizationId" = '00000000-0000-4000-8000-000000000001';
UPDATE "actualites_bibliotheque" SET "organizationId" = '00000000-0000-4000-8000-000000000001';
UPDATE "appareils_bloques" SET "organizationId" = '00000000-0000-4000-8000-000000000001';
UPDATE "domaines_bloques" SET "organizationId" = '00000000-0000-4000-8000-000000000001';
UPDATE "settings" SET "organizationId" = '00000000-0000-4000-8000-000000000001';
UPDATE "audit_logs" SET "organizationId" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "users" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "sessions" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "actualites_bibliotheque" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "appareils_bloques" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "domaines_bloques" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "settings" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "actualites_bibliotheque" ADD CONSTRAINT "actualites_bibliotheque_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appareils_bloques" ADD CONSTRAINT "appareils_bloques_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domaines_bloques" ADD CONSTRAINT "domaines_bloques_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "users_email_key";
CREATE UNIQUE INDEX "users_organizationId_email_key" ON "users"("organizationId", "email");
CREATE INDEX "users_organizationId_role_idx" ON "users"("organizationId", "role");
CREATE INDEX "sessions_organizationId_role_debut_idx" ON "sessions"("organizationId", "role", "debut");
CREATE INDEX "sessions_organizationId_debut_idx" ON "sessions"("organizationId", "debut");
CREATE INDEX "sessions_organizationId_fin_debut_idx" ON "sessions"("organizationId", "fin", "debut");
CREATE INDEX "actualites_bibliotheque_organizationId_published_publishedAt_idx" ON "actualites_bibliotheque"("organizationId", "published", "publishedAt");
DROP INDEX "appareils_bloques_adresseMac_key";
CREATE UNIQUE INDEX "appareils_bloques_organizationId_adresseMac_key" ON "appareils_bloques"("organizationId", "adresseMac");
CREATE INDEX "appareils_bloques_organizationId_active_blockedAt_idx" ON "appareils_bloques"("organizationId", "active", "blockedAt");
DROP INDEX "domaines_bloques_domain_role_key";
CREATE UNIQUE INDEX "domaines_bloques_organizationId_domain_role_key" ON "domaines_bloques"("organizationId", "domain", "role");
CREATE INDEX "domaines_bloques_organizationId_role_active_idx" ON "domaines_bloques"("organizationId", "role", "active");
DROP INDEX "settings_key_key";
CREATE UNIQUE INDEX "settings_organizationId_key_key" ON "settings"("organizationId", "key");
CREATE INDEX "settings_organizationId_idx" ON "settings"("organizationId");
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

DELETE FROM "settings" WHERE "key" = 'organization_profile';
CREATE INDEX "users_email_idx" ON "users"("email");
DROP INDEX "sessions_role_debut_idx";
DROP INDEX "sessions_debut_idx";
DROP INDEX "sessions_fin_debut_idx";

COMMIT;
