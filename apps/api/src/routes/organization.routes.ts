/**
 * Organization Routes
 */

import { Router } from "express";
import * as orgController from "../controllers/organization.controller";
import * as policyController from "../controllers/policy.controller";
import * as roleController from "../controllers/role.controller";
import { authenticate } from "../middleware/auth";
import { generalRateLimiter } from "../middleware/security";
import { validate } from "../validators/validation.middleware";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  getOrganizationsQuerySchema,
  organizationIdParamSchema,
  inviteMemberSchema,
  organizationInvitationIdParamSchema,
  orgMemberIdParamSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  orgTeamIdParamSchema,
  teamMemberIdParamSchema,
  orgScopedParamSchema,
  policyIdParamSchema,
  roleIdParamSchema,
  memberIdParamSchema,
  createPolicySchema,
  updatePolicySchema,
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  teamRoleParamSchema,
} from "../validators/organization.validator";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  generalRateLimiter,
  validate({ body: createOrganizationSchema }),
  orgController.createOrganization,
);
router.get(
  "/",
  validate({ query: getOrganizationsQuerySchema }),
  orgController.getOrganizations,
);
router.get(
  "/invitations/mine",
  orgController.getMyPendingInvitations,
);
router.post(
  "/invitations/accept",
  validate({ body: acceptInvitationSchema }),
  orgController.acceptInvitation,
);
router.get(
  "/:id",
  validate({ params: organizationIdParamSchema }),
  orgController.getOrganization,
);
router.patch(
  "/:id",
  validate({ params: organizationIdParamSchema, body: updateOrganizationSchema }),
  orgController.updateOrganization,
);
router.delete(
  "/:id",
  validate({ params: organizationIdParamSchema }),
  orgController.deleteOrganization,
);

router.get(
  "/:id/members",
  validate({ params: organizationIdParamSchema, query: getOrganizationsQuerySchema }),
  orgController.getMembers,
);
router.post(
  "/:id/invitations",
  validate({ params: organizationIdParamSchema, body: inviteMemberSchema }),
  orgController.inviteUser,
);
router.get(
  "/:id/invitations",
  validate({ params: organizationIdParamSchema }),
  orgController.getOrganizationInvitations,
);
router.delete(
  "/:id/invitations/:invitationId",
  validate({ params: organizationIdParamSchema.merge(organizationInvitationIdParamSchema) }),
  orgController.revokeInvitation,
);
router.delete(
  "/:id/members/:userId",
  validate({ params: organizationIdParamSchema.merge(orgMemberIdParamSchema) }),
  orgController.removeMember,
);
router.patch(
  "/:id/members/:userId",
  validate({
    params: organizationIdParamSchema.merge(orgMemberIdParamSchema),
    body: updateMemberRoleSchema,
  }),
  orgController.updateMemberRole,
);

router.get(
  "/:id/teams",
  validate({ params: organizationIdParamSchema }),
  orgController.getTeams,
);
router.post(
  "/:id/teams",
  validate({ params: organizationIdParamSchema, body: createTeamSchema }),
  orgController.createTeam,
);
router.patch(
  "/:id/teams/:teamId",
  validate({ params: organizationIdParamSchema.merge(orgTeamIdParamSchema), body: updateTeamSchema }),
  orgController.updateTeam,
);
router.delete(
  "/:id/teams/:teamId",
  validate({ params: organizationIdParamSchema.merge(orgTeamIdParamSchema) }),
  orgController.deleteTeam,
);
router.post(
  "/:id/teams/:teamId/members",
  validate({ params: organizationIdParamSchema.merge(orgTeamIdParamSchema), body: addTeamMemberSchema }),
  orgController.addTeamMember,
);
router.delete(
  "/:id/teams/:teamId/members/:userId",
  validate({ params: organizationIdParamSchema.merge(orgTeamIdParamSchema).merge(teamMemberIdParamSchema) }),
  orgController.removeTeamMember,
);

/**
 * Access Policies Management (IAM)
 */
router.get(
  "/:orgId/policies",
  validate({ params: orgScopedParamSchema }),
  policyController.getPolicies,
);
router.post(
  "/:orgId/policies",
  validate({ params: orgScopedParamSchema, body: createPolicySchema }),
  policyController.createPolicy,
);
router.put(
  "/:orgId/policies/:policyId",
  validate({ params: orgScopedParamSchema.merge(policyIdParamSchema), body: updatePolicySchema }),
  policyController.updatePolicy,
);
router.delete(
  "/:orgId/policies/:policyId",
  validate({ params: orgScopedParamSchema.merge(policyIdParamSchema) }),
  policyController.deletePolicy,
);

/**
 * Custom Roles Management (IAM)
 */
router.get(
  "/:orgId/roles",
  validate({ params: orgScopedParamSchema }),
  roleController.getRoles,
);
router.post(
  "/:orgId/roles",
  validate({ params: orgScopedParamSchema, body: createRoleSchema }),
  roleController.createRole,
);
router.put(
  "/:orgId/roles/:roleId",
  validate({ params: orgScopedParamSchema.merge(roleIdParamSchema), body: updateRoleSchema }),
  roleController.updateRole,
);
router.put(
  "/:orgId/members/:memberId/roles",
  validate({ params: orgScopedParamSchema.merge(memberIdParamSchema), body: assignRoleSchema }),
  roleController.assignUserRole,
);
router.put(
  "/:orgId/teams/:teamId/roles",
  validate({ params: orgScopedParamSchema.merge(orgTeamIdParamSchema), body: assignRoleSchema }),
  roleController.assignTeamRole,
);
router.get(
  "/:orgId/teams/:teamId/roles",
  validate({ params: orgScopedParamSchema.merge(orgTeamIdParamSchema) }),
  roleController.getTeamRoles,
);
router.delete(
  "/:orgId/teams/:teamId/roles/:roleId",
  validate({ params: orgScopedParamSchema.merge(orgTeamIdParamSchema).merge(teamRoleParamSchema) }),
  roleController.removeTeamRole,
);

export default router;
