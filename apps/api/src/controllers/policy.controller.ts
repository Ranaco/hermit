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
