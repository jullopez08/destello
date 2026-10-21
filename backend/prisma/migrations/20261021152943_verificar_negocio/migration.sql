-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- Las empresas que ya existían quedan verificadas, salvo las inscritas con Instagram/Maps o carta.
UPDATE "Organization" o SET "verifiedAt" = o."createdAt"
WHERE o."findUs" IS NULL AND NOT EXISTS (SELECT 1 FROM "BusinessMenu" m WHERE m."organizationId" = o.id);
