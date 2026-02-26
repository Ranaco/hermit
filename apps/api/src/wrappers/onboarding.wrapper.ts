/**
 * Onboarding Wrapper
 * Contains business logic for user onboarding flow
 */

import {
  AuthorizationError,
  ValidationError,
  ErrorCode,
  NotFoundError,
  ConflictError,
} from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";
import { createAuditLog } from "../services/audit.service";
import { RolePermissions } from "../constants/permissions";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const onboardingWrapper = {
  /**
   * Get onboarding status for user
   */
  async getOnboardingStatus(userId: string) {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            role: true,
            organization: {
              include: {
                vaults: {
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    const hasOrganization = user.organizations.length > 0;
    const firstMembership = user.organizations[0];
    const hasVault =
      hasOrganization && firstMembership.organization.vaults.length > 0;

    const onboardingComplete =
      hasOrganization &&
      firstMembership.onboardingState === "COMPLETED" &&
      hasVault;

    return {
      hasOrganization,
      hasVault,
      onboardingComplete,
      currentStep: firstMembership?.onboardingStep || 1,
      organization: hasOrganization
        ? {
            id: firstMembership.organization.id,
            name: firstMembership.organization.name,
            role: firstMembership.role?.name,
          }
        : null,
    };
  },

  /**
   * Create first organization during onboarding
   */
  async createFirstOrganization(
    userId: string,
    data: {
      name: string;
      description?: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description } = data;
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if user already has organizations
    const existingOrgs = await prisma.organizationMember.count({
      where: { userId },
    });

    if (existingOrgs > 0) {
      throw new ConflictError(
        ErrorCode.VALIDATION_ERROR,
        "User already has an organization",
      );
    }

    // Create organization with default vault in transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          slug: `${toSlug(name)}-${Math.random().toString(36).slice(2, 8)}`,
          description,
        },
      });

      const ownerRole = await tx.organizationRole.create({
        data: {
          organizationId: organization.id,
          name: "OWNER",
          description: "Full administrative access",
          permissions: RolePermissions["OWNER"],
          isDefault: false,
        },
      });

      await tx.organizationRole.createMany({
        data: [
          {
            organizationId: organization.id,
            name: "ADMIN",
            description: "Administrative access",
            permissions: RolePermissions["ADMIN"],
            isDefault: false,
          },
          {
            organizationId: organization.id,
            name: "MEMBER",
            description: "Standard member access",
            permissions: RolePermissions["MEMBER"],
            isDefault: true,
          },
        ],
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          roleId: ownerRole.id,
          onboardingState: "IN_PROGRESS",
          onboardingStep: 2, // Move to step 2 after org creation
        },
      });

      // Auto-create default vault
      const defaultVault = await tx.vault.create({
        data: {
          name: "Default Vault",
          description: "Your default secure vault for storing encryption keys",
          organizationId: organization.id,
          createdById: userId,
          permissions: {
            create: {
              userId,
              permissionLevel: "ADMIN",
            },
          },
        },
      });

      return { organization, defaultVault };
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "ONBOARDING",
      resourceId: result.organization.id,
      details: {
        step: "organization_created",
        organizationName: name,
        defaultVaultId: result.defaultVault.id,
      },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return {
      organization: result.organization,
      vault: result.defaultVault,
    };
  },

  /**
   * Complete onboarding for a user
   */
  async completeOnboarding(userId: string, organizationId: string) {
    const prisma = getPrismaClient();

    // Verify user is member of organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
      },
      include: {
        organization: {
          include: {
            vaults: {
              take: 1,
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundError(
        ErrorCode.ORGANIZATION_NOT_FOUND,
        "Organization not found or you are not a member",
      );
    }

    // Ensure organization has at least one vault
    if (membership.organization.vaults.length === 0) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Organization must have at least one vault before completing onboarding",
      );
    }

    // Mark onboarding as complete
    const updatedMembership = await prisma.organizationMember.update({
      where: {
        id: membership.id,
      },
      data: {
        onboardingState: "COMPLETED",
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "ONBOARDING",
      resourceId: organizationId,
      details: {
        step: "onboarding_completed",
      },
      ipAddress: "system",
      userAgent: "system",
    });

    return {
      success: true,
      onboardingComplete: true,
      membership: updatedMembership,
    };
  },

  /**
   * Ensure user has a default vault in their organization
   */
  async ensureDefaultVault(userId: string, organizationId: string) {
    const prisma = getPrismaClient();

    // Check if organization already has vaults
    const existingVaults = await prisma.vault.findMany({
      where: {
        organizationId,
      },
      take: 1,
    });

    if (existingVaults.length > 0) {
      return { vault: existingVaults[0], created: false };
    }

    // Create default vault
    const vault = await prisma.vault.create({
      data: {
        name: "Default Vault",
        description: "Your default secure vault for storing encryption keys",
        organizationId,
        createdById: userId,
        permissions: {
          create: {
            userId,
            permissionLevel: "ADMIN",
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "VAULT",
      resourceId: vault.id,
      details: {
        vaultName: vault.name,
        autoCreated: true,
      },
      ipAddress: "system",
      userAgent: "system",
    });

    return { vault, created: true };
  },
};
