-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "findUs" TEXT;

-- AlterTable
ALTER TABLE "SignupRequest" ADD COLUMN     "findUs" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "menuName" TEXT,
ADD COLUMN     "menuPdf" BYTEA;

-- CreateTable
CREATE TABLE "BusinessMenu" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMenu_organizationId_key" ON "BusinessMenu"("organizationId");

-- AddForeignKey
ALTER TABLE "BusinessMenu" ADD CONSTRAINT "BusinessMenu_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
