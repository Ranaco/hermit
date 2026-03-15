/**
 * Secret Wrapper
 * Contains business logic for secure secret storage with encryption via HashiCorp Vault Transit Engine
 *
 * Three-tier security model:
 * 1. Secret-level password (highest) - requires password to decrypt specific secret
 * 2. Vault-level password (medium) - requires password to access any secret in vault
 * 3. Authentication only (basic) - just requires login
 */

import {
  ValidationError,
  ErrorCode,
  NotFoundError,
  ForbiddenError,
} from "@hermit/error-handling";
import getPrismaClient from "../services/prisma.service";
import encryptionService from "../services/encryption.service";
import { createAuditLog } from "../services/audit.service";
import {
  evaluateStatementsAgainstAny,
  getUserPolicies,
  type PolicyStatement,
} from "../services/policy-engine";
import {
  buildGroupCandidateResourceUrns,
  buildSecretCandidateResourceUrns,
  buildSecretUrn,
} from "../services/iam-resource.service";
import { hashPassword, verifyPassword } from "../utils/password";

async function collectDescendantGroupIds(
  prisma: ReturnType<typeof getPrismaClient>,
  vaultId: string,
  parentId: string,
): Promise<string[]> {
  const parent = await prisma.secretGroup.findUnique({
    where: { id: parentId },
    select: { path: true },
  });

  if (!parent?.path) {
    return [];
  }

  const descendants = await prisma.secretGroup.findMany({
    where: {
      vaultId,
      path: {
        startsWith: `${parent.path}/`,
      },
    },
    select: {
      id: true,
    },
  });

  return descendants.map((group) => group.id);
}

type AccessContext = {
  canBypass: boolean;
  policyStatements: PolicyStatement[];
};

async function getAccessContext(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  orgId: string,
): Promise<AccessContext> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  const canBypass = membership?.role?.name === "OWNER";

  return {
    canBypass,
    policyStatements: canBypass ? [] : await getUserPolicies(userId, orgId),
  };
}

function canAccessSecretAction(
  accessContext: AccessContext,
  action: string,
  data: {
    orgId: string;
    vaultId: string;
    secretId: string;
    groupPath?: string | null;
  },
) {
  if (accessContext.canBypass) {
    return true;
  }

  return evaluateStatementsAgainstAny(
    accessContext.policyStatements,
    action,
    buildSecretCandidateResourceUrns({
      orgId: data.orgId,
      vaultId: data.vaultId,
      secretId: data.secretId,
      groupPath: data.groupPath,
    }),
  );
}

function canAccessGroupScopedAction(
  accessContext: AccessContext,
  action: string,
  data: {
    orgId: string;
    vaultId: string;
    groupId?: string | null;
    groupPath?: string | null;
  },
) {
  if (accessContext.canBypass) {
    return true;
  }

  if (data.groupId) {
    return evaluateStatementsAgainstAny(
      accessContext.policyStatements,
      action,
      buildGroupCandidateResourceUrns({
        orgId: data.orgId,
        vaultId: data.vaultId,
        groupId: data.groupId,
        path: data.groupPath,
      }),
    );
  }

  return evaluateStatementsAgainstAny(accessContext.policyStatements, action, [
    buildSecretUrn(data.orgId, data.vaultId, "*"),
  ]);
}

function assertSecretAction(
  accessContext: AccessContext,
  action: string,
  data: {
    orgId: string;
    vaultId: string;
    secretId: string;
    groupPath?: string | null;
  },
) {
  if (canAccessSecretAction(accessContext, action, data)) {
    return;
  }

  throw new ForbiddenError(
    ErrorCode.INSUFFICIENT_PERMISSIONS,
    "Access denied by IAM policy",
  );
}

export const secretWrapper = {
  /**
   * Create a new secret
   */
  async createSecret(
    userId: string,
    data: {
      name: string;
      description?: string;
      value: string;
      valueType?: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
      vaultId: string;
      secretGroupId?: string;
      keyId: string;
      password?: string;      
      metadata?: Record<string, any>;
      tags?: string[];
      expiresAt?: Date | string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const {
      name,
      description,
      value,
      valueType,
      vaultId,
      secretGroupId,
      keyId,
      password,
      metadata,
      tags,
      expiresAt,
    } = data;

    if (!name || !value || !vaultId || !keyId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Name, value, vaultId, and keyId are required",
      );
    }

    const prisma = getPrismaClient();

    // Check vault exists and get vault details
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found",
      );
    }

    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);

    // Verify key exists and belongs to the vault
    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vaultId,
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key || !key.versions[0]) {
      throw new NotFoundError(
        ErrorCode.KEY_NOT_FOUND,
        "Key not found in this vault",
      );
    }

    if (secretGroupId) {
      const secretGroup = await prisma.secretGroup.findUnique({
        where: { id: secretGroupId },
        select: { id: true, vaultId: true, path: true },
      });

      if (!secretGroup || secretGroup.vaultId !== vaultId) {
        throw new ValidationError(
          "Secret group must belong to the selected vault",
        );
      }

      if (
        !canAccessGroupScopedAction(accessContext, "secrets:create", {
          orgId: vault.organizationId,
          vaultId,
          groupId: secretGroup.id,
          groupPath: secretGroup.path,
        })
      ) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Access denied by IAM policy",
        );
      }
    } else if (
      !canAccessGroupScopedAction(accessContext, "secrets:create", {
        orgId: vault.organizationId,
        vaultId,
      })
    ) {
      throw new ForbiddenError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Access denied by IAM policy",
      );
    }

    // Get the vault transit key name from the key version
    const vaultKeyName = key.versions[0].encryptedValue;

    // Encrypt the secret value using HashiCorp Vault Transit Engine
    const encryptedValue = await encryptionService.encrypt(vaultKeyName, value);

    // Hash the secret password if provided (secret-level protection)
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    // Create secret with first version
    const secret = await prisma.secret.create({
      data: {
        name,
        description,
        vaultId,
        secretGroupId,
        keyId,
        valueType,
        passwordHash,
        metadata,
        tags: tags || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            encryptedValue,
            encryptionContext: {
              keyId,
              vaultKeyName,
              algorithm: "aes256-gcm96",
            },
            createdById: userId,
          },
        },
      },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
          },
        },
        key: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
          },
        },
      },
    });

    // Update currentVersionId
    await prisma.secret.update({
      where: { id: secret.id },
      data: { currentVersionId: secret.versions[0].id },
    });

    await createAuditLog({
      userId,
      organizationId: vault.organizationId,
      vaultId,
      action: "CREATE_SECRET",
      resourceType: "SECRET",
      resourceId: secret.id,
      details: {
        secretName: name,
        vaultId,
        secretGroupId,
        keyId,
        hasPassword: !!password,
        versionNumber: 1,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { secret };
  },

  /**
   * Get all secrets in a vault
   */
  async getSecrets(
    userId: string,
    data: {
      vaultId: string;
      secretGroupId?: string;
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const { vaultId, secretGroupId, page = 1, limit = 20, search } = data;

    const where: any = {
      vaultId,
    };
    
    // Exact match for secretGroupId or only root vault secrets (secretGroupId = null)
    if (secretGroupId) {
      where.secretGroupId = secretGroupId;
    } else {
      where.secretGroupId = null;
    }

    if (!vaultId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Vault ID is required",
      );
    }

    const prisma = getPrismaClient();

    // Check vault exists
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found",
      );
    }

    if (search) {
      where.OR = [
        { id: { startsWith: search } },
        { name: { contains: search, mode: "insensitive" } as any },
        { description: { contains: search, mode: "insensitive" } as any },
      ];
    }

    const [secrets, total] = await Promise.all([
      prisma.secret.findMany({
        where,
        include: {
          secretGroup: {
            select: {
              id: true,
              path: true,
            },
          },
          key: {
            select: {
              id: true,
              name: true,
            },
          },
          currentVersion: {
            select: {
              versionNumber: true,
              createdAt: true,
            },
          },
          _count: {
            select: { versions: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.secret.count({ where }),
    ]);

    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);

    // Don't return encrypted values or password hashes in list view
    const sanitizedSecrets = secrets
      .filter((secret) => {
        return canAccessSecretAction(accessContext, "secrets:read", {
          orgId: vault.organizationId,
          vaultId,
          secretId: secret.id,
          groupPath: secret.secretGroup?.path,
        });
      })
      .map((secret) => ({
        ...secret,
        secretGroup: secret.secretGroup
          ? {
              id: secret.secretGroup.id,
            }
          : null,
        hasPassword: !!secret.passwordHash,
        passwordHash: undefined,
      }));

    return {
      secrets: sanitizedSecrets,
      meta: {
        total: accessContext.canBypass ? total : sanitizedSecrets.length,
        page,
        limit,
        totalPages: Math.ceil((accessContext.canBypass ? total : sanitizedSecrets.length) / limit),
      },
    };
  },

  /**
   * Get a single secret with current and latest version metadata
   */
  async getSecret(
    userId: string,
    data: {
      secretId: string;
    },
  ) {
    const { secretId } = data;
    const prisma = getPrismaClient();

    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
        key: {
          select: {
            id: true,
            name: true,
            valueType: true,
          },
        },
        secretGroup: {
          select: {
            id: true,
            name: true,
            parentId: true,
            path: true,
            depth: true,
          },
        },
        currentVersion: {
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
            commitMessage: true,
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
            commitMessage: true,
          },
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    const accessContext = await getAccessContext(prisma, userId, secret.vault.organizationId);
    assertSecretAction(accessContext, "secrets:read", {
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId: secret.id,
      groupPath: secret.secretGroup?.path,
    });

    return {
      secret: {
        ...secret,
        secretGroup: secret.secretGroup
          ? {
              id: secret.secretGroup.id,
              name: secret.secretGroup.name,
              parentId: secret.secretGroup.parentId,
              depth: secret.secretGroup.depth,
            }
          : null,
        latestVersion: secret.versions[0] || null,
        versionCount: secret._count.versions,
        hasPassword: !!secret.passwordHash,
        passwordHash: undefined,
        versions: undefined,
        _count: undefined,
      },
    };
  },

  /**
   * Reveal a specific secret (requires password verification if protected)
   */
  async revealSecret(
    userId: string,
    data: {
      secretId: string;
      password?: string;
      vaultPassword?: string;
      versionNumber?: number;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { secretId, password, vaultPassword, versionNumber } = data;

    const prisma = getPrismaClient();

    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            passwordHash: true,
            organizationId: true,
          },
        },
        secretGroup: {
          select: {
            path: true,
          },
        },
        key: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        },
        currentVersion: {
          select: {
            id: true,
            versionNumber: true,
            encryptedValue: true,
          },
        },
        versions: {
          where: versionNumber ? { versionNumber } : {},
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    const accessContext = await getAccessContext(prisma, userId, secret.vault.organizationId);
    assertSecretAction(accessContext, "secrets:use", {
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId: secret.id,
      groupPath: secret.secretGroup?.path,
    });

    // Three-tier security verification
    // 1. Secret-level password (highest priority)
    if (secret.passwordHash) {
      if (!password) {
        return {
          requiresPassword: "secret" as const,
          error: {
            code: "SECRET_PASSWORD_REQUIRED",
            message: "This secret is protected with a password",
          },
        };
      }

      const isValidPassword = await verifyPassword(
        password,
        secret.passwordHash,
      );
      if (!isValidPassword) {
        await createAuditLog({
          userId,
          organizationId: secret.vault.organizationId,
          vaultId: secret.vault.id,
          action: "READ_SECRET",
          resourceType: "SECRET",
          resourceId: secret.id,
          details: { success: false, reason: "Invalid secret password" },
          ipAddress: auditInfo.ipAddress || "unknown",
          userAgent: auditInfo.userAgent || "unknown",
        });

        throw new ForbiddenError(
          ErrorCode.INVALID_CREDENTIALS,
          "Invalid secret password",
        );
      }
    }
    // 2. Vault-level password (medium priority)
    else if (secret.vault.passwordHash) {
      if (!vaultPassword) {
        return {
          requiresPassword: "vault" as const,
          error: {
            code: "VAULT_PASSWORD_REQUIRED",
            message: "This vault is protected with a password",
          },
        };
      }

      const isValidVaultPassword = await verifyPassword(
        vaultPassword,
        secret.vault.passwordHash,
      );
      if (!isValidVaultPassword) {
        await createAuditLog({
          userId,
          organizationId: secret.vault.organizationId,
          vaultId: secret.vault.id,
          action: "READ_SECRET",
          resourceType: "SECRET",
          resourceId: secret.id,
          details: { success: false, reason: "Invalid vault password" },
          ipAddress: auditInfo.ipAddress || "unknown",
          userAgent: auditInfo.userAgent || "unknown",
        });

        throw new ForbiddenError(
          ErrorCode.INVALID_CREDENTIALS,
          "Invalid vault password",
        );
      }
    }
    // 3. Authentication only (already verified by middleware)

    // Check expiration
    if (secret.expiresAt && new Date() > secret.expiresAt) {
      throw new ForbiddenError(
        ErrorCode.RESOURCE_EXPIRED,
        "This secret has expired",
      );
    }

    const version = versionNumber ? secret.versions[0] : secret.currentVersion;
    if (!version) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Secret version not found",
      );
    }

    // Get vault transit key name
    const vaultKeyName = secret.key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new Error("Key configuration error");
    }

    // Decrypt using HashiCorp Vault Transit Engine
    const decryptedValue = await encryptionService.decrypt(
      vaultKeyName,
      version.encryptedValue,
    );

    // Update access metadata
    await prisma.secret.update({
      where: { id: secret.id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    await createAuditLog({
      userId,
      organizationId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      action: "READ_SECRET",
      resourceType: "SECRET",
      resourceId: secret.id,
      details: {
        success: true,
        versionNumber: version.versionNumber,
        authMethod: secret.passwordHash
          ? "secret-password"
          : secret.vault.passwordHash
            ? "vault-password"
            : "auth-only",
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return {
      secret: {
        id: secret.id,
        name: secret.name,
        description: secret.description,
        value: decryptedValue,
        metadata: secret.metadata,
        tags: secret.tags,
        versionNumber: version.versionNumber,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        expiresAt: secret.expiresAt,
        lastAccessedAt: secret.lastAccessedAt,
        accessCount: secret.accessCount + 1,
      },
    };
  },

  /**
   * Update a secret (creates a new version)
   */
  async updateSecret(
    userId: string,
    data: {
      secretId: string;
      value?: string;
      valueType?: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
      description?: string;
      password?: string;
      metadata?: Record<string, any>;
      tags?: string[];
      expiresAt?: Date | string;
      secretGroupId?: string;
      commitMessage?: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const {
      secretId,
      value,
      valueType,
      description,
      password,
      metadata,
      tags,
      expiresAt,
      commitMessage,
      secretGroupId,
    } = data;

    const prisma = getPrismaClient();

    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: {
        vault: {
          select: {
            id: true,
            passwordHash: true,
            organizationId: true,
          },
        },
        secretGroup: {
          select: {
            path: true,
          },
        },
        key: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    const accessContext = await getAccessContext(prisma, userId, secret.vault.organizationId);
    assertSecretAction(accessContext, "secrets:update", {
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId: secret.id,
      groupPath: secret.secretGroup?.path,
    });

    const currentVersion = secret.versions[0];
    const nextVersionNumber = currentVersion
      ? currentVersion.versionNumber + 1
      : 1;

    // Get vault transit key name
    const vaultKeyName = secret.key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new Error("Key configuration error");
    }

    // Prepare update data
    const updateData: any = {};

    if (description !== undefined) updateData.description = description;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (tags !== undefined) updateData.tags = tags;
    if (expiresAt !== undefined)
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (secretGroupId !== undefined)
      updateData.secretGroupId = secretGroupId;
    if (valueType !== undefined)
      updateData.valueType = valueType;

    if (secretGroupId !== undefined && secretGroupId !== null) {
      const secretGroup = await prisma.secretGroup.findUnique({
        where: { id: secretGroupId },
        select: { id: true, vaultId: true, path: true },
      });

      if (!secretGroup || secretGroup.vaultId !== secret.vaultId) {
        throw new ValidationError(
          "Secret group must belong to the same vault as the secret",
        );
      }

      if (
        !canAccessGroupScopedAction(accessContext, "secrets:update", {
          orgId: secret.vault.organizationId,
          vaultId: secret.vault.id,
          groupId: secretGroup.id,
          groupPath: secretGroup.path,
        })
      ) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Access denied by IAM policy",
        );
      }
    }

    if (secretGroupId === null) {
      if (
        !canAccessGroupScopedAction(accessContext, "secrets:update", {
          orgId: secret.vault.organizationId,
          vaultId: secret.vault.id,
        })
      ) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Access denied by IAM policy",
        );
      }
    }

    // Update password if provided
    if (password !== undefined) {
      updateData.passwordHash = password
        ? await hashPassword(password)
        : null;
    }

    // Create new version if value is being updated
    if (value !== undefined) {
      const encryptedValue = await encryptionService.encrypt(
        vaultKeyName,
        value,
      );

      const newVersion = await prisma.secretVersion.create({
        data: {
          secretId: secret.id,
          versionNumber: nextVersionNumber,
          encryptedValue,
          encryptionContext: {
            keyId: secret.keyId,
            vaultKeyName,
            algorithm: "aes256-gcm96",
          },
          commitMessage,
          createdById: userId,
        },
      });

      updateData.currentVersionId = newVersion.id;
    }

    // Update secret
    const updatedSecret = await prisma.secret.update({
      where: { id: secretId },
      data: updateData,
      include: {
        vault: {
          select: {
            id: true,
            name: true,
          },
        },
        key: {
          select: {
            id: true,
            name: true,
          },
        },
        currentVersion: {
          select: {
            versionNumber: true,
            createdAt: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE_SECRET",
      resourceType: "SECRET",
      resourceId: secret.id,
      details: {
        updatedFields: Object.keys(updateData),
        newVersion: value !== undefined ? nextVersionNumber : undefined,
        commitMessage,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { secret: updatedSecret };
  },

  /**
   * Delete a secret
   */
  async deleteSecret(
    userId: string,
    data: {
      secretId: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { secretId } = data;

    const prisma = getPrismaClient();

    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: {
        vault: {
          select: {
            id: true,
            organizationId: true,
          },
        },
        secretGroup: {
          select: {
            path: true,
          },
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    const accessContext = await getAccessContext(prisma, userId, secret.vault.organizationId);
    assertSecretAction(accessContext, "secrets:delete", {
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId: secret.id,
      groupPath: secret.secretGroup?.path,
    });

    await prisma.secret.delete({
      where: { id: secretId },
    });

    await createAuditLog({
      userId,
      organizationId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      action: "DELETE_SECRET",
      resourceType: "SECRET",
      resourceId: secretId,
      details: { secretName: secret.name, vaultId: secret.vaultId },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return {};
  },

  /**
   * Get secret version history
   */
  async getSecretVersions(
    userId: string,
    data: {
      secretId: string;
    },
  ) {
    const { secretId } = data;

    const prisma = getPrismaClient();

    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: {
        vault: {
          select: { id: true, organizationId: true },
        },
        secretGroup: {
          select: {
            path: true,
          },
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    const accessContext = await getAccessContext(prisma, userId, secret.vault.organizationId);
    assertSecretAction(accessContext, "secrets:read", {
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId,
      groupPath: secret.secretGroup?.path,
    });

    const versions = await prisma.secretVersion.findMany({
      where: { secretId },
      select: {
        id: true,
        versionNumber: true,
        commitMessage: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { versionNumber: "desc" },
    });

    return {
      versions,
      count: versions.length,
      currentVersionId: secret.currentVersionId,
    };
  },

  /**
   * Point the secret at an existing version without creating a new one
   */
  async setCurrentSecretVersion(
    userId: string,
    data: {
      secretId: string;
      versionId: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { secretId, versionId } = data;
    const prisma = getPrismaClient();

    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: {
        vault: {
          select: {
            id: true,
            organizationId: true,
          },
        },
        secretGroup: {
          select: {
            path: true,
          },
        },
        currentVersion: {
          select: {
            id: true,
            versionNumber: true,
          },
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    const accessContext = await getAccessContext(prisma, userId, secret.vault.organizationId);
    assertSecretAction(accessContext, "secrets:update", {
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId: secret.id,
      groupPath: secret.secretGroup?.path,
    });

    const version = await prisma.secretVersion.findFirst({
      where: {
        id: versionId,
        secretId,
      },
      select: {
        id: true,
        versionNumber: true,
        createdAt: true,
        commitMessage: true,
      },
    });

    if (!version) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Secret version not found",
      );
    }

    const updatedSecret = await prisma.secret.update({
      where: { id: secretId },
      data: {
        currentVersionId: version.id,
      },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
          },
        },
        key: {
          select: {
            id: true,
            name: true,
          },
        },
        currentVersion: {
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
            commitMessage: true,
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
            commitMessage: true,
          },
        },
      },
    });

    await createAuditLog({
      userId,
      organizationId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      action: "UPDATE_SECRET",
      resourceType: "SECRET",
      resourceId: secret.id,
      details: {
        currentVersionId: version.id,
        currentVersionNumber: version.versionNumber,
        previousVersionId: secret.currentVersionId,
        previousVersionNumber: secret.currentVersion?.versionNumber,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return {
      secret: {
        ...updatedSecret,
        latestVersion: updatedSecret.versions[0] || null,
        hasPassword: !!updatedSecret.passwordHash,
        passwordHash: undefined,
        versions: undefined,
      },
    };
  },

  /**
   * Bulk reveal secrets in a vault (for CLI `hermit run`)
   * Skips password-protected and expired secrets unless passwords are provided.
   * Returns { name: decryptedValue } pairs.
   */
  async bulkRevealSecrets(
    userId: string,
    data: {
      vaultId: string;
      secretGroupId?: string;
      secretIds?: string[];
      includeDescendants?: boolean;
      password?: string;
      vaultPassword?: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const {
      vaultId,
      secretGroupId,
      secretIds,
      includeDescendants,
      password,
      vaultPassword,
    } = data;

    const prisma = getPrismaClient();

    if (secretGroupId && secretIds?.length) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "secretGroupId and secretIds cannot be combined in one bulk reveal request",
      );
    }

    // Check vault exists
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      select: {
        id: true,
        name: true,
        passwordHash: true,
        organizationId: true,
      },
    });

    if (!vault) {
      throw new NotFoundError(ErrorCode.VAULT_NOT_FOUND, "Vault not found");
    }

    // If vault is password-protected, verify vault password
    if (vault.passwordHash) {
      if (!vaultPassword) {
        return {
          secrets: [],
          skipped: [],
          error: {
            code: "VAULT_PASSWORD_REQUIRED",
            message: "This vault is protected with a password",
          },
        };
      }

      const isValidVaultPassword = await verifyPassword(
        vaultPassword,
        vault.passwordHash,
      );
      if (!isValidVaultPassword) {
        throw new ForbiddenError(
          ErrorCode.INVALID_CREDENTIALS,
          "Invalid vault password",
        );
      }
    }

    // Build query — fetch ALL secrets in the vault (or group)
    const accessContext = await getAccessContext(prisma, userId, vault.organizationId);

    const where: any = { vaultId };
    if (secretIds?.length) {
      where.id = { in: secretIds };
    } else if (secretGroupId && includeDescendants) {
      const descendantGroupIds = await collectDescendantGroupIds(prisma, vaultId, secretGroupId);
      where.secretGroupId = { in: [secretGroupId, ...descendantGroupIds] };
    } else if (secretGroupId) {
      where.secretGroupId = secretGroupId;
    }

    const secrets = await prisma.secret.findMany({
      where,
      include: {
        secretGroup: {
          select: {
            path: true,
          },
        },
        key: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" as const },
              take: 1,
            },
          },
        },
        currentVersion: {
          select: {
            id: true,
            versionNumber: true,
            encryptedValue: true,
          },
        },
      },
    });

    const revealed: Array<{ name: string; value: string }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    for (const secret of secrets) {
      if (!canAccessSecretAction(accessContext, "secrets:use", {
        orgId: vault.organizationId,
        vaultId,
        secretId: secret.id,
        groupPath: secret.secretGroup?.path,
      })) {
        continue;
      }

      // Skip expired secrets
      if (secret.expiresAt && new Date() > secret.expiresAt) {
        skipped.push({ name: secret.name, reason: "expired" });
        continue;
      }

      // Handle secret-level password
      if (secret.passwordHash) {
        if (!password) {
          skipped.push({ name: secret.name, reason: "password-protected" });
          continue;
        }
        const isValid = await verifyPassword(password, secret.passwordHash);
        if (!isValid) {
          skipped.push({ name: secret.name, reason: "invalid-password" });
          continue;
        }
      }

      const version = secret.currentVersion;
      if (!version) {
        skipped.push({ name: secret.name, reason: "no-version" });
        continue;
      }

      const vaultKeyName = secret.key.versions[0]?.encryptedValue;
      if (!vaultKeyName) {
        skipped.push({ name: secret.name, reason: "key-error" });
        continue;
      }

      try {
        const decryptedValue = await encryptionService.decrypt(
          vaultKeyName,
          version.encryptedValue,
        );
        revealed.push({ name: secret.name, value: decryptedValue });

        // Update access metadata
        await prisma.secret.update({
          where: { id: secret.id },
          data: {
            lastAccessedAt: new Date(),
            accessCount: { increment: 1 },
          },
        });
      } catch {
        skipped.push({ name: secret.name, reason: "decrypt-error" });
      }
    }

    // Single audit log for the bulk operation
    await createAuditLog({
      userId,
      organizationId: vault.organizationId,
      vaultId,
      action: "READ_SECRET",
      resourceType: "VAULT",
      resourceId: vaultId,
      details: {
        revealedCount: revealed.length,
        skippedCount: skipped.length,
        secretGroupId,
        secretIdsCount: secretIds?.length || 0,
        includeDescendants: !!includeDescendants,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return {
      secrets: revealed,
      skipped,
      count: revealed.length,
    };
  },
};
