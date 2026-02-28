/**
 * Organization Roles Controller
 * Manages custom roles and policy attachments for an Organization
 */

import type { Request, Response } from "express";
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
  ErrorCode,
  NotFoundError,
} from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";

/**
 * Get all roles in an organization
 * GET /api/v1/organizations/:orgId/roles
 */
export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const prisma = getPrismaClient();

  const roles = await prisma.organizationRole.findMany({
    where: { organizationId: orgId },
    include: {
      policyAttachments: {
        include: {
          policy: {
            select: { id: true, name: true, description: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: { roles }
  });
});

/**
 * Create a new Role
 * POST /api/v1/organizations/:orgId/roles
 */
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const { name, description, policyIds } = req.body;

  if (!name) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Role name is required");
  }

  const prisma = getPrismaClient();

  const role = await prisma.organizationRole.create({
    data: {
      name,
      description,
      organizationId: orgId,
      policyAttachments: policyIds && Array.isArray(policyIds) ? {
        create: policyIds.map((policyId: string) => ({
          policyId
        }))
      } : undefined
    },
    include: {
      policyAttachments: {
        include: { policy: true }
      }
    }
  });

  res.status(201).json({
    success: true,
    data: { role },
    message: "Role created successfully"
  });
});

/**
 * Assign a Role to a User
 * PUT /api/v1/organizations/:orgId/members/:memberId/roles
 */
export const assignUserRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const memberId = req.params.memberId;
  const { roleId } = req.body;

  if (!roleId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Target roleId is required");
  }

  const prisma = getPrismaClient();

  // OrganizationMember actually stores the role directly as an ID currently
  // This updates the user's primary organization role
  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.organizationId !== orgId) {
    throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Member not found in this organization");
  }

  const updatedMember = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { roleId },
    include: { role: true }
  });

  res.json({
    success: true,
    data: { member: updatedMember },
    message: "User role updated successfully"
  });
});

/**
 * Assign a Role to a Team
 * PUT /api/v1/organizations/:orgId/teams/:teamId/roles
 */
export const assignTeamRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const teamId = req.params.teamId;
  const { roleId } = req.body;

  if (!roleId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Target roleId is required");
  }

  const prisma = getPrismaClient();

  // Validate team exists in org
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!team || team.organizationId !== orgId) {
    throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Team not found in this organization");
  }

  // Upsert the assignment
  const assignment = await prisma.teamRoleAssignment.upsert({
    where: {
      teamId_roleId: {
        teamId,
        roleId
      }
    },
    update: {},
    create: {
      teamId,
      roleId
    },
    include: {
      role: true
    }
  });

  res.json({
    success: true,
    data: { assignment },
    message: "Team role assigned successfully"
  });
});
