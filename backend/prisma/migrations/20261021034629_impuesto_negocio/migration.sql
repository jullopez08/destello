-- CreateEnum
CREATE TYPE "SalesTax" AS ENUM ('NONE', 'INC', 'IVA');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "salesTax" "SalesTax" NOT NULL DEFAULT 'NONE';
