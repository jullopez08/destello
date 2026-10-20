-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('PRODUCTION', 'RESTAURANT');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "approvalPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'PRODUCTION';

-- CreateTable
CREATE TABLE "SignupRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeExpiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupRequest_email_key" ON "SignupRequest"("email");
