-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- Lo que ya salió o se entregó se da por pagado; lo que está por producir queda por verificar.
UPDATE "Order" SET "paidAt" = COALESCE("deliveredAt", "createdAt") WHERE "status" IN ('ON_THE_WAY', 'DELIVERED');
