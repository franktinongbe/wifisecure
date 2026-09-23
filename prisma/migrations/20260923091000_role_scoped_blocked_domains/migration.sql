-- Keep the existing block list effective for both roles, then allow separate rules.
ALTER TABLE "domaines_bloques"
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'agent';

DROP INDEX "domaines_bloques_domain_key";

INSERT INTO "domaines_bloques" ("id", "domain", "role", "active", "createdAt", "updatedBy")
SELECT md5("id" || ':admin'), "domain", 'admin'::"Role", "active", "createdAt", "updatedBy"
FROM "domaines_bloques"
WHERE "role" = 'agent';

CREATE UNIQUE INDEX "domaines_bloques_domain_role_key"
ON "domaines_bloques" ("domain", "role");
