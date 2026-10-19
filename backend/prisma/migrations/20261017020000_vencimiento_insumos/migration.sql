-- Vencimiento de insumos: lotes por compra y lo que se bota.
ALTER TABLE "Supply" ADD COLUMN "perishable" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SupplyBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "left" DOUBLE PRECISION NOT NULL,
    "expiresOn" TEXT NOT NULL,
    "receivedOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplyWaste" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "cost" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyWaste_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplyBatch_organizationId_idx" ON "SupplyBatch"("organizationId");
CREATE INDEX "SupplyBatch_supplyId_idx" ON "SupplyBatch"("supplyId");
CREATE INDEX "SupplyWaste_organizationId_date_idx" ON "SupplyWaste"("organizationId", "date");

ALTER TABLE "SupplyBatch" ADD CONSTRAINT "SupplyBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplyBatch" ADD CONSTRAINT "SupplyBatch_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplyWaste" ADD CONSTRAINT "SupplyWaste_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplyWaste" ADD CONSTRAINT "SupplyWaste_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
