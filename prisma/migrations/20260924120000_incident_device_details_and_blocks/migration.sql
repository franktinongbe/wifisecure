ALTER TABLE "sessions"
  ADD COLUMN "adresseIp" TEXT,
  ADD COLUMN "adresseMac" TEXT,
  ADD COLUMN "navigateur" TEXT;

CREATE TABLE "appareils_bloques" (
  "id" TEXT NOT NULL,
  "adresseMac" TEXT NOT NULL,
  "adresseIp" TEXT,
  "identifiantUsager" TEXT NOT NULL,
  "appareil" TEXT NOT NULL,
  "navigateur" TEXT,
  "infraction" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedBy" TEXT NOT NULL,
  "unblockedAt" TIMESTAMP(3),
  "unblockedBy" TEXT,
  CONSTRAINT "appareils_bloques_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appareils_bloques_sessionId_fkey" FOREIGN KEY ("sessionId")
    REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "appareils_bloques_adresseMac_key" ON "appareils_bloques"("adresseMac");
CREATE INDEX "appareils_bloques_active_blockedAt_idx" ON "appareils_bloques"("active", "blockedAt");
CREATE INDEX "appareils_bloques_sessionId_idx" ON "appareils_bloques"("sessionId");
