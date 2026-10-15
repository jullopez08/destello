-- CreateEnum
CREATE TYPE "SaleKind" AS ENUM ('BOX', 'UNIT', 'SIZES');

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "packSupplyId" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sizeId" TEXT;

-- AlterTable
ALTER TABLE "Presentation" ADD COLUMN     "kind" "SaleKind" NOT NULL DEFAULT 'BOX';

-- AlterTable
ALTER TABLE "PresentationItem" ADD COLUMN     "surcharge" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PresentationSize" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "portions" TEXT NOT NULL DEFAULT '',
    "mold" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packSupplyId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PresentationSize_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PresentationSize" ADD CONSTRAINT "PresentationSize_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationSize" ADD CONSTRAINT "PresentationSize_packSupplyId_fkey" FOREIGN KEY ("packSupplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PresentationSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_packSupplyId_fkey" FOREIGN KEY ("packSupplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
