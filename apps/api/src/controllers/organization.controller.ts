/**
 * Organization Controller
 */

import type { Request, Response } from "express";
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
  ErrorCode,
} from "@hermes/error-handling";
import { organizationWrapper } from "../wrappers/organization.wrapper";

function assertUser(req: Request) {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }
  return req.user;
}

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);

  const { name, description } = req.body;
  if (!name) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Organization name is required");
  }

  const result = await organizationWrapper.createOrganization(
    user.id,
    { name, description },
    { ipAddress: req.ip || "unknown", userAgent: req.headers["user-agent"] || "unknown" },
  );

  res.status(201).json({
    success: true,
    data: { organization: result.organization, vault: result.vault },
    message: "Organization created successfully",
  });
});

export const getOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const result = await organizationWrapper.getOrganizations(user.id);
  res.json({ success: true, data: result });
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const result = await organizationWrapper.getOrganization(user.id, req.params.id);
  res.json({ success: true, data: result });
});

export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const { page, limit, search } = req.query;

  const result = await organizationWrapper.getMembers(user.id, req.params.id, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    search: search as string,
  });

  res.json({ success: true, data: result });
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);

  const result = await organizationWrapper.updateOrganization(
    user.id,
    req.params.id,
    { name: req.body.name, description: req.body.description },
    { ipAddress: req.ip || "unknown", userAgent: req.headers["user-agent"] || "unknown" },
  );

  res.json({
    success: true,
    data: result,
    message: "Organization updated successfully",
  });
});

export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);

  await organizationWrapper.deleteOrganization(
    user.id,
    req.params.id,
    { ipAddress: req.ip || "unknown", userAgent: req.headers["user-agent"] || "unknown" },
  );

  res.json({ success: true, message: "Organization deleted successfully" });
});

export const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);

  const { email, roleId } = req.body;
  if (!email) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Email is required");
  }

  const result = await organizationWrapper.inviteUser(
    user.id,
    req.params.id,
    { email, roleId },
    { ipAddress: req.ip || "unknown", userAgent: req.headers["user-agent"] || "unknown" },
  );

  res.status(201).json({
    success: true,
    data: result,
    message: result.member
      ? "User added to organization successfully"
      : "Invitation created successfully",
  });
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const { token } = req.body;

  if (!token) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Invitation token is required");
  }

  const result = await organizationWrapper.acceptInvitation(user.id, token);

  res.json({
    success: true,
    data: result,
    message: "Invitation accepted successfully",
  });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);

  await organizationWrapper.removeMember(
    user.id,
    req.params.id,
    req.params.userId,
    { ipAddress: req.ip || "unknown", userAgent: req.headers["user-agent"] || "unknown" },
  );

  res.json({ success: true, message: "Member removed successfully" });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const { roleId } = req.body;

  if (!roleId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Target roleId is required");
  }

  const result = await organizationWrapper.updateMemberRole(
    user.id,
    req.params.id,
    req.params.userId,
    roleId,
    { ipAddress: req.ip || "unknown", userAgent: req.headers["user-agent"] || "unknown" },
  );

  res.json({
    success: true,
    data: result,
    message: "Member role updated successfully",
  });
});

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const result = await organizationWrapper.getTeams(user.id, req.params.id);
  res.json({ success: true, data: result });
});

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const { name, description } = req.body;

  if (!name) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Team name is required");
  }

  const result = await organizationWrapper.createTeam(user.id, req.params.id, {
    name,
    description,
  });

  res.status(201).json({
    success: true,
    data: result,
    message: "Team created successfully",
  });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const result = await organizationWrapper.updateTeam(
    user.id,
    req.params.id,
    req.params.teamId,
    { name: req.body.name, description: req.body.description },
  );

  res.json({ success: true, data: result, message: "Team updated successfully" });
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  await organizationWrapper.deleteTeam(user.id, req.params.id, req.params.teamId);
  res.json({ success: true, message: "Team deleted successfully" });
});

export const addTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);
  const { userId } = req.body;

  if (!userId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "User ID is required");
  }

  const result = await organizationWrapper.addTeamMember(
    user.id,
    req.params.id,
    req.params.teamId,
    userId,
  );

  res.status(201).json({
    success: true,
    data: result,
    message: "Team member added successfully",
  });
});

export const removeTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const user = assertUser(req);

  await organizationWrapper.removeTeamMember(
    user.id,
    req.params.id,
    req.params.teamId,
    req.params.userId,
  );

  res.json({ success: true, message: "Team member removed successfully" });
});
