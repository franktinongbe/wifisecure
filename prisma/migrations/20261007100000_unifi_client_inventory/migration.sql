BEGIN;

CREATE TABLE "unifi_clients" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "controllerClientId" TEXT NOT NULL,
  "name" TEXT,
  "type" TEXT,
  "ipAddress" VARCHAR(64),
  "macAddress" VARCHAR(64),
  "connectedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "online" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "unifi_clients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unifi_clients_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "unifi_clients_organizationId_siteId_controllerClientId_key"
  ON "unifi_clients"("organizationId", "siteId", "controllerClientId");
CREATE INDEX "unifi_clients_organizationId_siteId_online_lastSeenAt_idx"
  ON "unifi_clients"("organizationId", "siteId", "online", "lastSeenAt");

COMMIT;