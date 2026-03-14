/**
 * Organization Policies Controller
 * Manages IAM JSON Policies for an Organization
 */

import type { Request, Response } from "express";
import {
  asyncHandler,
  AuthenticationError,
  ErrorCode,
} from "@hermes/error-handling";
import { policyWrapper } from "../wrappers/policy.wrapper";

/**
 * Get all policies in an organization
 * GET /api/v1/organizations/:orgId/policies
 */
export const getPolicies = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await policyWrapper.getPolicies(req.user.id, req.params.orgId);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Create a new Policy
 * POST /api/v1/organizations/:orgId/policies
 */
export const createPolicy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await policyWrapper.createPolicy(
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
    message: "Policy created successfully",
  });
});

/**
 * Update an existing Policy
 * PUT /api/v1/organizations/:orgId/policies/:policyId
 */
export const updatePolicy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  const result = await policyWrapper.updatePolicy(
    req.user.id,
    req.params.orgId,
    req.params.policyId,
    req.body,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  );

  res.json({
    success: true,
    data: result,
    message: "Policy updated successfully",
  });
});

/**
 * Delete a Policy
 * DELETE /api/v1/organizations/:orgId/policies/:policyId
 */
export const deletePolicy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  await policyWrapper.deletePolicy(
    req.user.id,
    req.params.orgId,
    req.params.policyId,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  );

  res.json({
    success: true,
    message: "Policy deleted successfully",
  });
});
