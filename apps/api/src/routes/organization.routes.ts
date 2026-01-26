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
} from "../validators/organization.validator";

const router = Router();

// All organization routes require authentication
router.use(authenticate);

/**
 * Organization management
 */
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
  validate({
    params: organizationIdParamSchema,
    body: updateOrganizationSchema,
  }),
  orgController.updateOrganization,
);
router.delete(
  "/:id",
  validate({ params: organizationIdParamSchema }),
  orgController.deleteOrganization,
);

/**
 * Member management
 */
router.get(
  "/:id/members",
  validate({ query: getOrganizationsQuerySchema }),
  orgController.getMembers,
);

router.post(
  "/:id/invitations",
  validate({ params: organizationIdParamSchema, body: inviteMemberSchema }),
  orgController.inviteUser,
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

export default router;
