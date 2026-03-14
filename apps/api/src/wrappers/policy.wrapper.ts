import {
  AuthorizationError,
  ErrorCode,
  NotFoundError,
  ValidationError,
} from "@hermes/error-handling";
import type { Prisma } from "@hermes/prisma";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import { evaluateAccess } from "../services/policy-engine";
import { buildPolicyUrn, ensureOrganizationIamBootstrap } from "../services/organization-iam.service";

async function requirePolicyAction(
  userId: string,
  organizationId: string,
  action: string,
  resourceUrn: string,
  message: string,
) {
  await ensureOrganizationIamBootstrap(organizationId);

  const prisma = getPrismaClient();
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { role: true },
  });

  if (!membership) {
    throw new AuthorizationError(
      ErrorCode.NOT_ORGANIZATION_MEMBER,
      "You are not a member of this organization",
    );
  }

  const allowed = await evaluateAccess(userId, organizationId, action, resourceUrn);
  if (!allowed) {
    throw new AuthorizationError(ErrorCode.INSUFFICIENT_PERMISSIONS, message);
  }
}

function resolvePolicyDocument(input: {
  document?: Record<string, unknown>;
  statements?: Array<Record<string, unknown>>;
}): Prisma.InputJsonValue {
  if (input.document) {
    return input.document as Prisma.InputJsonValue;
  }

  if (input.statements) {
    return {
      version: "2026-03-14",
      statements: input.statements,
    } as Prisma.InputJsonValue;
  }

  throw new ValidationError("Policy document or statements are required");
}

export const policyWrapper = {
  async getPolicies(userId: string, organizationId: string) {
    await requirePolicyAction(
      userId,
      organizationId,
      "policies:read",
      buildPolicyUrn(organizationId, "*"),
      "You do not have permission to view organization policies",
    );

    const prisma = getPrismaClient();
    const policies = await prisma.policy.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return { policies };
  },

  async createPolicy(
    userId: string,
    organizationId: string,
    data: {
      name: string;
      description?: string | null;
      document?: Record<string, unknown>;
      statements?: Array<Record<string, unknown>>;
    },
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requirePolicyAction(
      userId,
      organizationId,
      "policies:create",
      buildPolicyUrn(organizationId, "*"),
      "You do not have permission to create organization policies",
    );

    const prisma = getPrismaClient();
    const policy = await prisma.policy.create({
      data: {
        organizationId,
        name: data.name.trim(),
        description: data.description ?? undefined,
        document: resolvePolicyDocument(data),
        isManaged: false,
      },
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {
        type: "policy",
        policyId: policy.id,
        policyName: policy.name,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { policy };
  },

  async updatePolicy(
    userId: string,
    organizationId: string,
    policyId: string,
    data: {
      name?: string;
      description?: string | null;
      document?: Record<string, unknown>;
      statements?: Array<Record<string, unknown>>;
    },
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requirePolicyAction(
      userId,
      organizationId,
      "policies:update",
      buildPolicyUrn(organizationId, policyId),
      "You do not have permission to update organization policies",
    );

    const prisma = getPrismaClient();
    const existingPolicy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!existingPolicy || existingPolicy.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Policy not found in this organization");
    }

    if (existingPolicy.isManaged) {
      throw new ValidationError("Managed policies cannot be modified");
    }

    const updatedPolicy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        name: data.name?.trim(),
        description: data.description !== undefined ? data.description : undefined,
        document: data.document || data.statements
          ? resolvePolicyDocument(data)
          : undefined,
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {
        type: "policy",
        policyId,
        updatedFields: Object.keys(data),
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { policy: updatedPolicy };
  },

  async deletePolicy(
    userId: string,
    organizationId: string,
    policyId: string,
    auditInfo: { ipAddress?: string; userAgent?: string },
  ) {
    await requirePolicyAction(
      userId,
      organizationId,
      "policies:delete",
      buildPolicyUrn(organizationId, policyId),
      "You do not have permission to delete organization policies",
    );

    const prisma = getPrismaClient();
    const existingPolicy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!existingPolicy || existingPolicy.organizationId !== organizationId) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Policy not found in this organization");
    }

    if (existingPolicy.isManaged) {
      throw new ValidationError("Managed policies cannot be deleted");
    }

    await prisma.policy.delete({
      where: { id: policyId },
    });

    await createAuditLog({
      userId,
      action: "DELETE",
      resourceType: "ORGANIZATION",
      resourceId: organizationId,
      details: {
        type: "policy",
        policyId,
        policyName: existingPolicy.name,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { success: true };
  },
};
