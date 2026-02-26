import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, ErrorCode, asyncHandler } from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";
import { PermissionLevel } from "@prisma/client";

const permissionHierarchy: Record<PermissionLevel, number> = {
  VIEW: 1,
  USE: 2,
  EDIT: 3,
  ADMIN: 4,
};

/**
 * Require specific permission level for a Vault
 * Checks direct User bindings OR Team bindings
 */
export function requireVaultPermission(requiredLevel: PermissionLevel) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const vaultId = req.params.vaultId || req.params.id || req.body.vaultId || (req.query.vaultId as string);

    if (!vaultId) {
      throw new AuthenticationError(ErrorCode.VALIDATION_ERROR, "Vault ID required for permission check");
    }

    const prisma = getPrismaClient();

    // Find the vault to ensure it exists and get its orgId
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      select: { organizationId: true },
    });

    if (!vault) {
      throw new AuthenticationError(ErrorCode.VAULT_NOT_FOUND, "Vault not found");
    }

    // Admins/Owners of the Organization inherently have ADMIN over the vault
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: vault.organizationId,
          userId: req.user.id,
        },
      },
      include: { role: true },
    });

    if (orgMembership && (orgMembership.role?.name === "ADMIN" || orgMembership.role?.name === "OWNER")) {
      return next();
    }

    // Check direct user binding
    const userBinding = await prisma.vaultBinding.findUnique({
      where: {
        userId_vaultId: {
          userId: req.user.id,
          vaultId: vaultId,
        },
      },
    });

    if (userBinding && permissionHierarchy[userBinding.permissionLevel] >= permissionHierarchy[requiredLevel]) {
      return next();
    }

    // Check team bindings
    const teamBindings = await prisma.vaultBinding.findMany({
      where: {
        vaultId: vaultId,
        teamId: { not: null },
        team: {
          members: {
            some: {
              userId: req.user.id,
            },
          },
        },
      },
      select: { permissionLevel: true },
    });

    const hasTeamPermission = teamBindings.some(
      (binding) => permissionHierarchy[binding.permissionLevel] >= permissionHierarchy[requiredLevel]
    );

    if (hasTeamPermission) {
      return next();
    }

    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Requires ${requiredLevel} permission on Vault`
    );
  });
}

/**
 * Require specific permission level for a Key
 * Checks direct User bindings OR Team bindings, cascading down from Vault permissions
 */
export function requireKeyPermission(requiredLevel: PermissionLevel) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const keyId = req.params.keyId || req.params.id || req.body.keyId || (req.query.keyId as string);

    if (!keyId) {
      throw new AuthenticationError(ErrorCode.VALIDATION_ERROR, "Key ID required for permission check");
    }

    const prisma = getPrismaClient();

    const key = await prisma.key.findUnique({
      where: { id: keyId },
      select: { vaultId: true, vault: { select: { organizationId: true } } },
    });

    if (!key) {
      throw new AuthenticationError(ErrorCode.RESOURCE_NOT_FOUND, "Key not found");
    }

    // 1. Org Admin check
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: key.vault.organizationId,
          userId: req.user.id,
        },
      },
      include: { role: true },
    });

    if (orgMembership && (orgMembership.role?.name === "ADMIN" || orgMembership.role?.name === "OWNER")) {
      return next();
    }

    // 2. Direct Key user binding
    const userKeyBinding = await prisma.keyBinding.findUnique({
      where: {
        userId_keyId: {
          userId: req.user.id,
          keyId: keyId,
        },
      },
    });

    if (userKeyBinding && permissionHierarchy[userKeyBinding.permissionLevel] >= permissionHierarchy[requiredLevel]) {
      return next();
    }

    // 3. Team Key bindings
    const teamKeyBindings = await prisma.keyBinding.findMany({
      where: {
        keyId: keyId,
        teamId: { not: null },
        team: { members: { some: { userId: req.user.id } } },
      },
    });

    if (teamKeyBindings.some(b => permissionHierarchy[b.permissionLevel] >= permissionHierarchy[requiredLevel])) {
      return next();
    }

    // 4. Cascade from Vault user binding
    const userVaultBinding = await prisma.vaultBinding.findUnique({
      where: {
        userId_vaultId: {
          userId: req.user.id,
          vaultId: key.vaultId,
        },
      },
    });

    if (userVaultBinding && permissionHierarchy[userVaultBinding.permissionLevel] >= permissionHierarchy[requiredLevel]) {
      return next();
    }

    // 5. Cascade from Vault team bindings
    const teamVaultBindings = await prisma.vaultBinding.findMany({
      where: {
        vaultId: key.vaultId,
        teamId: { not: null },
        team: { members: { some: { userId: req.user.id } } },
      },
    });

    if (teamVaultBindings.some(b => permissionHierarchy[b.permissionLevel] >= permissionHierarchy[requiredLevel])) {
      return next();
    }

    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Requires ${requiredLevel} permission on Key or parent Vault`
    );
  });
}
