/**
 * Organization Roles Controller
 * Manages custom roles and policy attachments for an Organization
 */

import type { Request, Response } from "express";
import {
  asyncHandler,
  AuthenticationError,
  ErrorCode,
} from "@hermit/error-handling";
import { roleWrapper } from "../wrappers/role.wrapper";

/**
 * Get all roles in an organization
 * GET /api/v1/organizations/:orgId/roles
 */
export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await roleWrapper.getRoles(req.user.id, req.params.orgId);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Create a new Role
 * POST /api/v1/organizations/:orgId/roles
 */
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await roleWrapper.createRole(
    req.user.id,
    req.params.orgId,
    req.body,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  );

  res.status(201).json({
    success: true,
    data: result,
    message: "Role created successfully",
  });
});

/**
 * Update an existing Role
 * PUT /api/v1/organizations/:orgId/roles/:roleId
 */
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await roleWrapper.updateRole(
    req.user.id,
    req.params.orgId,
    req.params.roleId,
    req.body,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  );

  res.json({
    success: true,
    data: result,
    message: "Role updated successfully",
  });
});

/**
 * Assign a Role to a User
 * PUT /api/v1/organizations/:orgId/members/:memberId/roles
 */
export const assignUserRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await roleWrapper.assignUserRole(
    req.user.id,
    req.params.orgId,
    req.params.memberId,
    req.body.roleId,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  );

  res.json({
    success: true,
    data: result,
    message: "User role updated successfully",
  });
});

/**
 * Assign a Role to a Team
 * PUT /api/v1/organizations/:orgId/teams/:teamId/roles
 */
export const assignTeamRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await roleWrapper.assignTeamRole(
    req.user.id,
    req.params.orgId,
    req.params.teamId,
    req.body.roleId,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  );

  res.json({
    success: true,
    data: result,
    message: "Team role assigned successfully",
  });
});
