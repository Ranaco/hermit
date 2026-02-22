/**
 * Organization Routes
 */

import { Router } from "express";
import * as orgController from "../controllers/organization.controller";
import { authenticate } from "../middleware/auth";
import { generalRateLimiter } from "../middleware/security";
import { validate } from "../validators/validation.middleware";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  getOrganizationsQuerySchema,
  organizationIdParamSchema,
  inviteMemberSchema,
  orgMemberIdParamSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  orgTeamIdParamSchema,
  teamMemberIdParamSchema,
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
router.post(
  "/invitations/accept",
  validate({ body: acceptInvitationSchema }),
  orgController.acceptInvitation,
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

export default router;
