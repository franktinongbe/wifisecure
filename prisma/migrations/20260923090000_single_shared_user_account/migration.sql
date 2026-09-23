-- Wi-Fi users share one account; administrators keep individually attributable accounts.
-- Preserve old accounts for audit, but leave only the oldest user account enabled.
UPDATE "users"
SET "isActive" = false
WHERE "role" = 'agent'
  AND "id" NOT IN (
    SELECT "id" FROM "users"
    WHERE "role" = 'agent'
    ORDER BY "createdAt", "id"
    LIMIT 1
  );

CREATE UNIQUE INDEX "users_single_agent_account_key"
ON "users" ("role")
WHERE "role" = 'agent' AND "isActive" = true;
