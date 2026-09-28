-- Each organization needs its own active shared agent account.
-- The previous partial unique index constrained active agents globally.
DROP INDEX IF EXISTS "users_single_agent_account_key";

CREATE UNIQUE INDEX "users_organizationId_single_agent_account_key"
ON "users" ("organizationId")
WHERE "role" = 'agent' AND "isActive" = true;
