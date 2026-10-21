-- CreateEnum
CREATE TYPE "CashMoveKind" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CashShift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "openKey" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedBy" TEXT NOT NULL,
    "openingCash" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "firstCount" INTEGER,
    "counted" INTEGER,
    "expected" INTEGER,
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMove" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "kind" "CashMoveKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashShift_openKey_key" ON "CashShift"("openKey");

-- CreateIndex
CREATE INDEX "CashShift_organizationId_openedAt_idx" ON "CashShift"("organizationId", "openedAt");

-- CreateIndex
CREATE INDEX "CashMove_organizationId_idx" ON "CashMove"("organizationId");

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMove" ADD CONSTRAINT "CashMove_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMove" ADD CONSTRAINT "CashMove_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
