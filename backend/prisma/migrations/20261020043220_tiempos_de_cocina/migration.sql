-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "kitchenMaxMin" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "kitchenNormalMin" INTEGER NOT NULL DEFAULT 15;
