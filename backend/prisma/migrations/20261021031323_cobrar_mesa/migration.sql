-- CreateEnum
CREATE TYPE "TablePayMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD');

-- AlterTable
ALTER TABLE "TableSession" ADD COLUMN     "billAt" TIMESTAMP(3),
ADD COLUMN     "subtotal" INTEGER,
ADD COLUMN     "tip" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TablePayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "method" "TablePayMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TablePayment_organizationId_createdAt_idx" ON "TablePayment"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "TablePayment" ADD CONSTRAINT "TablePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablePayment" ADD CONSTRAINT "TablePayment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
