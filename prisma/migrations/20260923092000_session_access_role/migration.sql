ALTER TABLE "sessions"
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'agent';

CREATE INDEX "sessions_role_debut_idx"
ON "sessions" ("role", "debut");
