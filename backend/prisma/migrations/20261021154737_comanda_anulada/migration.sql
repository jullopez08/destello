-- AlterEnum
ALTER TYPE "KitchenTicketStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "KitchenTicket" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT;
