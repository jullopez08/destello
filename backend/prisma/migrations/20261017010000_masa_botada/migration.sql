-- Masa botada (vencida o dañada): lo que se perdió, para Analítica.
CREATE TABLE "DoughWaste" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "cost" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "expiresOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoughWaste_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DoughWaste_organizationId_date_idx" ON "DoughWaste"("organizationId", "date");

ALTER TABLE "DoughWaste" ADD CONSTRAINT "DoughWaste_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DoughWaste" ADD CONSTRAINT "DoughWaste_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
