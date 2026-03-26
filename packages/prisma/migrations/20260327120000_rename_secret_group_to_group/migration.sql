-- Phase 1: Fix Team/Group naming collision
-- The Team model was previously mapped to "Group" table. Rename to "Team" to free up the name.
ALTER TABLE "Group" RENAME TO "Team";
ALTER TABLE "GroupMember" RENAME TO "TeamMember";

-- Rename columns that were mapped from teamId to groupId
ALTER TABLE "TeamMember" RENAME COLUMN "groupId" TO "teamId";
ALTER TABLE "TeamRoleAssignment" RENAME COLUMN "groupId" TO "teamId";
ALTER TABLE "KeyShare" RENAME COLUMN "groupId" TO "teamId";

-- Phase 2: Rename SecretGroup → Group
ALTER TABLE "SecretGroup" RENAME TO "Group";

-- Rename secretGroupId → groupId on Secret table
ALTER TABLE "Secret" RENAME COLUMN "secretGroupId" TO "groupId";

-- Phase 3: Rename enum values
ALTER TYPE "ResourceType" RENAME VALUE 'SECRET_GROUP' TO 'GROUP';
ALTER TYPE "AuditAction" RENAME VALUE 'CREATE_SECRET_GROUP' TO 'CREATE_GROUP';
ALTER TYPE "AuditAction" RENAME VALUE 'UPDATE_SECRET_GROUP' TO 'UPDATE_GROUP';
ALTER TYPE "AuditAction" RENAME VALUE 'DELETE_SECRET_GROUP' TO 'DELETE_GROUP';
