CREATE TABLE "actualites_bibliotheque" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "summary" VARCHAR(360),
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "actualites_bibliotheque_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "actualites_bibliotheque_createdBy_idx" ON "actualites_bibliotheque"("createdBy");
CREATE INDEX "actualites_bibliotheque_published_publishedAt_idx" ON "actualites_bibliotheque"("published", "publishedAt");

ALTER TABLE "actualites_bibliotheque"
ADD CONSTRAINT "actualites_bibliotheque_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
