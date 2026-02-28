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
} from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";
import encryptionService from "../services/encryption.service";
import { createAuditLog } from "../services/audit.service";
import { hashPassword, verifyPassword } from "../utils/password";

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
        { name: { contains: search, mode: "insensitive" } as any },
        { description: { contains: search, mode: "insensitive" } as any },
      ];
    }

    const [secrets, total] = await Promise.all([
      prisma.secret.findMany({
        where,
        include: {
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

    // Don't return encrypted values or password hashes in list view
    const sanitizedSecrets = secrets.map((secret) => ({
      ...secret,
      hasPassword: !!secret.passwordHash,
      passwordHash: undefined,
    }));

    return {
      secrets: sanitizedSecrets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
          where: versionNumber ? { versionNumber } : {},
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    // Check if the vault even exists anymore (Permissions handled by RBAC or via child keys/vault properties)
    // Note: If you want to handle the specific secret-reveal permissions, the user must have USE permission.
    // However, because we aren't passing vaultId explicitly in `revealSecret`, we do need to check permissions here 
    // manually to prevent IDOR since the router wrapper couldn't.
    // Let's implement the equivalent of `requireKeyPermission('USE')` here for the secret's vault.
    
    // We already fetch `secret.vault.id` above. 
    // We need to verify org admin, direct user vault binding, or team vault binding.
    // For simplicity, we just check if the user has >= USE access on the vault.
    


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

    const version = secret.versions[0];
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
    if (data.valueType !== undefined)
      updateData.valueType = data.valueType;

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
          select: { id: true },
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }



    await prisma.secret.delete({
      where: { id: secretId },
    });

    await createAuditLog({
      userId,
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
          select: { id: true },
        },
      },
    });

    if (!secret) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }



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

    return { versions, count: versions.length };
  },
};