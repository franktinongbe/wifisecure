CREATE TABLE "actualite_pieces_jointes" (
    "id" TEXT NOT NULL,
    "newsPostId" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "actualite_pieces_jointes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "actualite_pieces_jointes_storagePath_key" ON "actualite_pieces_jointes"("storagePath");
CREATE INDEX "actualite_pieces_jointes_newsPostId_createdAt_idx" ON "actualite_pieces_jointes"("newsPostId", "createdAt");

ALTER TABLE "actualite_pieces_jointes"
ADD CONSTRAINT "actualite_pieces_jointes_newsPostId_fkey"
FOREIGN KEY ("newsPostId") REFERENCES "actualites_bibliotheque"("id") ON DELETE CASCADE ON UPDATE CASCADE;
