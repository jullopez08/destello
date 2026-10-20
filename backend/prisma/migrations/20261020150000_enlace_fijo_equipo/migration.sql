-- DropForeignKey
ALTER TABLE "StaffInvite" DROP CONSTRAINT "StaffInvite_staffId_fkey";

-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN     "linkFails" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linkHash" TEXT,
ADD COLUMN     "linkLockedUntil" TIMESTAMP(3);

-- DropTable
DROP TABLE "StaffInvite";

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_linkHash_key" ON "StaffMember"("linkHash");

