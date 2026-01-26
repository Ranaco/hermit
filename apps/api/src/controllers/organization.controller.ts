/**
 * Organization Controller
 * Handles organization management and membership
 */

import type { Request, Response } from 'express';
import { asyncHandler, AuthenticationError, ValidationError, ErrorCode, NotFoundError, AuthorizationError, ConflictError } from '@hermes/error-handling';
import { organizationWrapper } from '../wrappers/organization.wrapper';

/**
 * Create a new organization
 * POST /api/v1/organizations
 */
export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { name, description } = req.body;

  if (!name) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Organization name is required');
  }

  const result = await organizationWrapper.createOrganization(req.user.id, { name, description }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.status(201).json({
    success: true,
    data: { organization: result.organization },
    message: 'Organization created successfully',
  });
});

/**
 * Get organizations user is a member of
 * GET /api/v1/organizations
 */
export const getOrganizations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const result = await organizationWrapper.getOrganizations(req.user.id);

  res.json({
    success: true,
    data: { organizations: result.organizations },
  });
});

/**
 * Get a specific organization
 * GET /api/v1/organizations/:id
 */
export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  const result = await organizationWrapper.getOrganization(req.user.id, id);

  res.json({
    success: true,
    data: { organization: result.organization },
  });
});

/**
 * Get organization members
 * GET /api/v1/organizations/:id/members
 */
export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { page, limit, search } = req.query;

  const result = await organizationWrapper.getMembers(req.user.id, id, {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    search: search as string,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Update organization
 * PATCH /api/v1/organizations/:id
 */
export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { name, description } = req.body;

  const result = await organizationWrapper.updateOrganization(req.user.id, id, { name, description }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    data: { organization: result.organization },
    message: 'Organization updated successfully',
  });
});

/**
 * Delete organization
 * DELETE /api/v1/organizations/:id
 */
export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;

  await organizationWrapper.deleteOrganization(req.user.id, id, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Organization deleted successfully',
  });
});

/**
 * Invite user to organization
 * POST /api/v1/organizations/:id/invitations
 */
export const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { email, role = 'MEMBER' } = req.body;

  if (!email) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Email is required');
  }

  const result = await organizationWrapper.inviteUser(req.user.id, id, { email, role }, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.status(201).json({
    success: true,
    data: { member: result.member },
    message: 'User added to organization successfully',
  });
});

/**
 * Remove member from organization
 * DELETE /api/v1/organizations/:id/members/:userId
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id, userId } = req.params;

  await organizationWrapper.removeMember(req.user.id, id, userId, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    message: 'Member removed successfully',
  });
});

/**
 * Update member role
 * PATCH /api/v1/organizations/:id/members/:userId
 */
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  const { id, userId } = req.params;
  const { role } = req.body;

  if (!role) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Role is required');
  }

  const result = await organizationWrapper.updateMemberRole(req.user.id, id, userId, role, {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  res.json({
    success: true,
    data: { member: result.member },
    message: 'Member role updated successfully',
  });
});
