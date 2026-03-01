/**
 * Organization Policies Controller
 * Manages IAM JSON Policies for an Organization
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
 * Get all policies in an organization
 * GET /api/v1/organizations/:orgId/policies
 */
export const getPolicies = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  
  const orgId = req.params.orgId;
  const prisma = getPrismaClient();
  
  const policies = await prisma.policy.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: { policies }
  });
});

/**
 * Create a new Policy
 * POST /api/v1/organizations/:orgId/policies
 */
export const createPolicy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const { name, description, document, statements } = req.body;

  let policyDocument = document;
  if (!policyDocument && statements) {
    policyDocument = { statements };
  }

  if (!name || !policyDocument) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Name and document (or statements) are required");
  }

  const prisma = getPrismaClient();

  const policy = await prisma.policy.create({
    data: {
      name,
      description,
      document: policyDocument,
      organizationId: orgId,
      isManaged: false,
    },
  });

  res.status(201).json({
    success: true,
    data: { policy },
    message: "Policy created successfully"
  });
});

/**
 * Update an existing Policy
 * PUT /api/v1/organizations/:orgId/policies/:policyId
 */
export const updatePolicy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const policyId = req.params.policyId;
  const { name, description, document, statements } = req.body;

  const prisma = getPrismaClient();

  const existingPolicy = await prisma.policy.findUnique({
    where: { id: policyId }
  });

  if (!existingPolicy || existingPolicy.organizationId !== orgId) {
    throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Policy not found in this organization");
  }

  if (existingPolicy.isManaged) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Cannot edit a managed system policy");
  }

  let policyDocument = document;
  if (!policyDocument && statements) {
    policyDocument = { statements };
  }

  const updatedPolicy = await prisma.policy.update({
    where: { id: policyId },
    data: {
      name: name || undefined,
      description: description !== undefined ? description : undefined,
      document: policyDocument || undefined,
    },
  });

  res.json({
    success: true,
    data: { policy: updatedPolicy },
    message: "Policy updated successfully"
  });
});

/**
 * Delete a Policy
 * DELETE /api/v1/organizations/:orgId/policies/:policyId
 */
export const deletePolicy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AuthenticationError(ErrorCode.UNAUTHORIZED);

  const orgId = req.params.orgId;
  const policyId = req.params.policyId;

  const prisma = getPrismaClient();

  const existingPolicy = await prisma.policy.findUnique({
    where: { id: policyId }
  });

  if (!existingPolicy || existingPolicy.organizationId !== orgId) {
    throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Policy not found in this organization");
  }

  if (existingPolicy.isManaged) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Cannot delete a managed system policy");
  }

  await prisma.policy.delete({
    where: { id: policyId }
  });

  res.json({
    success: true,
    message: "Policy deleted successfully"
  });
});
