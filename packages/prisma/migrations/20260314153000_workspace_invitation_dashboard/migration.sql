-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "vaultId" TEXT;

-- DropIndex
DROP INDEX "OrganizationInvitation_email_organizationId_key";

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_vaultId_idx" ON "AuditLog"("vaultId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_vaultId_createdAt_idx" ON "AuditLog"("organizationId", "vaultId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_organizationId_idx" ON "OrganizationInvitation"("email", "organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationInvitation"
ADD CONSTRAINT "OrganizationInvitation_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
