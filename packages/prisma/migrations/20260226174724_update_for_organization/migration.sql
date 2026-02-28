/*
  Warnings:

  - You are about to drop the column `role` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `OrganizationMember` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATE_SECRET_GROUP';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_SECRET_GROUP';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_SECRET_GROUP';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_ORG_ROLE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_ORG_ROLE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_ORG_ROLE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResourceType" ADD VALUE 'SECRET_GROUP';
ALTER TYPE "ResourceType" ADD VALUE 'ORGANIZATION_ROLE';

-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT;

-- AlterTable
ALTER TABLE "OrganizationMember" DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT;

-- AlterTable
ALTER TABLE "Secret" ADD COLUMN     "secretGroupId" TEXT;

-- CreateTable
CREATE TABLE "OrganizationRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vaultId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretGroupBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "secretGroupId" TEXT NOT NULL,
    "permissionLevel" "PermissionLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretGroupBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRole_organizationId_name_key" ON "OrganizationRole"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SecretGroup_vaultId_parentId_name_key" ON "SecretGroup"("vaultId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SecretGroupBinding_userId_secretGroupId_key" ON "SecretGroupBinding"("userId", "secretGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SecretGroupBinding_groupId_secretGroupId_key" ON "SecretGroupBinding"("groupId", "secretGroupId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_secretGroupId_fkey" FOREIGN KEY ("secretGroupId") REFERENCES "SecretGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRole" ADD CONSTRAINT "OrganizationRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretGroup" ADD CONSTRAINT "SecretGroup_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretGroup" ADD CONSTRAINT "SecretGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SecretGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretGroupBinding" ADD CONSTRAINT "SecretGroupBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretGroupBinding" ADD CONSTRAINT "SecretGroupBinding_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretGroupBinding" ADD CONSTRAINT "SecretGroupBinding_secretGroupId_fkey" FOREIGN KEY ("secretGroupId") REFERENCES "SecretGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
