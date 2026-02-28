/*
  Warnings:

  - You are about to drop the `KeyPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SecretBinding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SecretGroupBinding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VaultPermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "KeyPermission" DROP CONSTRAINT "KeyPermission_groupId_fkey";

-- DropForeignKey
ALTER TABLE "KeyPermission" DROP CONSTRAINT "KeyPermission_keyId_fkey";

-- DropForeignKey
ALTER TABLE "KeyPermission" DROP CONSTRAINT "KeyPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "SecretBinding" DROP CONSTRAINT "SecretBinding_groupId_fkey";

-- DropForeignKey
ALTER TABLE "SecretBinding" DROP CONSTRAINT "SecretBinding_secretId_fkey";

-- DropForeignKey
ALTER TABLE "SecretBinding" DROP CONSTRAINT "SecretBinding_userId_fkey";

-- DropForeignKey
ALTER TABLE "SecretGroupBinding" DROP CONSTRAINT "SecretGroupBinding_groupId_fkey";

-- DropForeignKey
ALTER TABLE "SecretGroupBinding" DROP CONSTRAINT "SecretGroupBinding_secretGroupId_fkey";

-- DropForeignKey
ALTER TABLE "SecretGroupBinding" DROP CONSTRAINT "SecretGroupBinding_userId_fkey";

-- DropForeignKey
ALTER TABLE "VaultPermission" DROP CONSTRAINT "VaultPermission_groupId_fkey";

-- DropForeignKey
ALTER TABLE "VaultPermission" DROP CONSTRAINT "VaultPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "VaultPermission" DROP CONSTRAINT "VaultPermission_vaultId_fkey";

-- DropTable
DROP TABLE "KeyPermission";

-- DropTable
DROP TABLE "SecretBinding";

-- DropTable
DROP TABLE "SecretGroupBinding";

-- DropTable
DROP TABLE "VaultPermission";

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "document" JSONB NOT NULL,
    "isManaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePolicyAttachment" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,

    CONSTRAINT "RolePolicyAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRoleAssignment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "TeamRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_organizationId_name_key" ON "Policy"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePolicyAttachment_roleId_policyId_key" ON "RolePolicyAttachment"("roleId", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRoleAssignment_groupId_roleId_key" ON "TeamRoleAssignment"("groupId", "roleId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePolicyAttachment" ADD CONSTRAINT "RolePolicyAttachment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePolicyAttachment" ADD CONSTRAINT "RolePolicyAttachment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRoleAssignment" ADD CONSTRAINT "TeamRoleAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRoleAssignment" ADD CONSTRAINT "TeamRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
