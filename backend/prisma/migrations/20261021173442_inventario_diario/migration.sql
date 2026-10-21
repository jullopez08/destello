-- CreateTable
CREATE TABLE "SupplyStockDay" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "stock" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SupplyStockDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplyStockDay_organizationId_date_idx" ON "SupplyStockDay"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyStockDay_supplyId_date_key" ON "SupplyStockDay"("supplyId", "date");

-- AddForeignKey
ALTER TABLE "SupplyStockDay" ADD CONSTRAINT "SupplyStockDay_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyStockDay" ADD CONSTRAINT "SupplyStockDay_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
