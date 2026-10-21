-- AlterTable
ALTER TABLE "CashMove" ADD COLUMN     "category" TEXT,
ADD COLUMN     "noReceipt" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CashReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashReceipt_moveId_key" ON "CashReceipt"("moveId");

-- AddForeignKey
ALTER TABLE "CashReceipt" ADD CONSTRAINT "CashReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReceipt" ADD CONSTRAINT "CashReceipt_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "CashMove"("id") ON DELETE CASCADE ON UPDATE CASCADE;
