/**
 * Key Wrapper
 * Contains business logic for encryption key management and cryptographic operations
 */

import {
  AuthenticationError,
  ValidationError,
  ErrorCode,
  NotFoundError,
} from "@hermes/error-handling";
import getPrismaClient from "../services/prisma.service";
import encryptionService from "../services/encryption.service";
import { createAuditLog } from "../services/audit.service";

export const keyWrapper = {
  /**
   * Create a new encryption key
   */
  async createKey(
    userId: string,
    data: {
      name: string;
      description?: string;
      vaultId: string;
    },
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { name, description, vaultId } = data;
    const { ipAddress, userAgent } = auditData;

    if (!name || !vaultId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Name and vault ID are required",
      );
    }

    const prisma = getPrismaClient();

    // Check if user has permission to manage keys in this vault
    const vault = await prisma.vault.findFirst({
      where: {
        id: vaultId,
        OR: [
          {
            permissions: {
              some: {
                userId,
                permissionLevel: { in: ["EDIT" as const, "ADMIN" as const] },
              },
            },
          },
          {
            permissions: {
              some: {
                group: {
                  members: {
                    some: {
                      userId,
                    },
                  },
                },
                permissionLevel: { in: ["EDIT" as const, "ADMIN" as const] },
              },
            },
          },
        ],
      },
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found or insufficient permissions",
      );
    }

    // Generate unique key name for Vault Transit Engine
    // Vault transit keys must only contain alphanumeric characters, underscores, and hyphens
    // Clean the vault ID and name to ensure compatibility
    const cleanVaultId = vaultId.replace(/[^a-zA-Z0-9]/g, "");
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const timestamp = Date.now();
    const vaultKeyName = `key_${cleanVaultId}_${cleanName}_${timestamp}`;

    // Create key in Vault Transit Engine
    await encryptionService.createKey(vaultKeyName);

    // Create key record in database
    const key = await prisma.key.create({
      data: {
        name,
        description,
        vault: {
          connect: { id: vaultId },
        },
        createdBy: {
          connect: { id: userId },
        },
        versions: {
          create: {
            versionNumber: 1,
            encryptedValue: vaultKeyName, // Store vault key name in encrypted value
            encryptionMethod: "vault-transit",
            createdBy: {
              connect: { id: userId },
            },
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
        versions: true,
      },
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      resourceType: "KEY",
      resourceId: key.id,
      details: { keyName: name, vaultId },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { key };
  },

  /**
   * Get all keys in a vault
   */
  async getKeys(userId: string, vaultId: string) {
    if (!vaultId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Vault ID is required",
      );
    }

    const prisma = getPrismaClient();

    // Check if user has read permission on the vault
    const vault = await prisma.vault.findFirst({
      where: {
        id: vaultId,
        OR: [
          {
            permissions: {
              some: {
                userId,
                permissionLevel: {
                  in: [
                    "VIEW" as const,
                    "USE" as const,
                    "EDIT" as const,
                    "ADMIN" as const,
                  ],
                },
              },
            },
          },
          {
            permissions: {
              some: {
                group: {
                  members: {
                    some: {
                      userId,
                    },
                  },
                },
                permissionLevel: {
                  in: [
                    "VIEW" as const,
                    "USE" as const,
                    "EDIT" as const,
                    "ADMIN" as const,
                  ],
                },
              },
            },
          },
        ],
      },
    });

    if (!vault) {
      throw new NotFoundError(
        ErrorCode.VAULT_NOT_FOUND,
        "Vault not found or insufficient permissions",
      );
    }

    const keys = await prisma.key.findMany({
      where: { vaultId },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { keys };
  },

  /**
   * Get a specific key
   */
  async getKey(userId: string, keyId: string) {
    const prisma = getPrismaClient();

    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: {
                    in: [
                      "VIEW" as const,
                      "USE" as const,
                      "EDIT" as const,
                      "ADMIN" as const,
                    ],
                  },
                },
              },
            },
            {
              permissions: {
                some: {
                  group: {
                    members: {
                      some: {
                        userId,
                      },
                    },
                  },
                },
                permissionLevel: { in: ["VIEW", "USE", "EDIT", "ADMIN"] },
              },
            },
          ],
        },
      },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!key) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND);
    }

    return { key };
  },

  /**
   * Rotate a key (create new version)
   */
  async rotateKey(
    userId: string,
    keyId: string,
    auditData: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = auditData;

    const prisma = getPrismaClient();

    // Check if user has permission to manage keys
    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: { in: ["EDIT" as const, "ADMIN" as const] },
                },
              },
            },
            {
              permissions: {
                some: {
                  group: {
                    members: {
                      some: {
                        userId,
                      },
                    },
                  },
                },
                permissionLevel: { in: ["EDIT", "ADMIN"] },
              },
            },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 5,
        },
      },
    });

    if (!key) {
      throw new NotFoundError(
        ErrorCode.KEY_NOT_FOUND,
        "Key not found or insufficient permissions",
      );
    }

    const vaultKeyName = key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND, "Key version not found");
    }

    // Rotate key in Vault
    await encryptionService.rotateKey(vaultKeyName);

    // Create new version in database
    const latestVersion = key.versions[0];
    const newVersion = await prisma.keyVersion.create({
      data: {
        keyId: key.id,
        versionNumber: latestVersion.versionNumber + 1,
        encryptedValue: vaultKeyName,
        encryptionMethod: "vault-transit",
        createdById: userId,
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resourceType: "KEY",
      resourceId: key.id,
      details: { action: "rotate", versionNumber: newVersion.versionNumber },
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return { versionNumber: newVersion };
  },

  /**
   * Encrypt data
   */
  async encryptData(userId: string, keyId: string, plaintext: string) {
    if (!plaintext) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Plaintext is required",
      );
    }

    const prisma = getPrismaClient();

    // Check if user has read permission (encrypt requires read)
    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: {
                    in: [
                      "VIEW" as const,
                      "USE" as const,
                      "EDIT" as const,
                      "ADMIN" as const,
                    ],
                  },
                },
              },
            },
            {
              permissions: {
                some: {
                  group: {
                    members: {
                      some: {
                        userId,
                      },
                    },
                  },
                },
                permissionLevel: { in: ["VIEW", "USE", "EDIT", "ADMIN"] },
              },
            },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key) {
      throw new NotFoundError(
        ErrorCode.KEY_NOT_FOUND,
        "Key not found or insufficient permissions",
      );
    }

    const vaultKeyName = key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND, "Key version not found");
    }

    // Encrypt using Vault
    const ciphertext = await encryptionService.encrypt(vaultKeyName, plaintext);

    return { ciphertext };
  },

  /**
   * Decrypt data
   */
  async decryptData(userId: string, keyId: string, ciphertext: string) {
    if (!ciphertext) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Ciphertext is required",
      );
    }

    const prisma = getPrismaClient();

    // Check if user has read permission
    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: {
                    in: [
                      "VIEW" as const,
                      "USE" as const,
                      "EDIT" as const,
                      "ADMIN" as const,
                    ],
                  },
                },
              },
            },
            {
              permissions: {
                some: {
                  group: {
                    members: {
                      some: {
                        userId,
                      },
                    },
                  },
                },
                permissionLevel: { in: ["VIEW", "USE", "EDIT", "ADMIN"] },
              },
            },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key) {
      throw new NotFoundError(
        ErrorCode.KEY_NOT_FOUND,
        "Key not found or insufficient permissions",
      );
    }

    const vaultKeyName = key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND, "Key version not found");
    }

    // Decrypt using Vault
    const plaintext = await encryptionService.decrypt(vaultKeyName, ciphertext);

    return { plaintext };
  },

  /**
   * Batch encrypt multiple values
   */
  async batchEncrypt(userId: string, keyId: string, plaintexts: string[]) {
    if (!Array.isArray(plaintexts) || plaintexts.length === 0) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Plaintexts array is required",
      );
    }

    const prisma = getPrismaClient();

    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: {
                    in: [
                      "VIEW" as const,
                      "USE" as const,
                      "EDIT" as const,
                      "ADMIN" as const,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND);
    }

    const vaultKeyName = key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND, "Key version not found");
    }

    const ciphertexts = await encryptionService.batchEncrypt(
      vaultKeyName,
      plaintexts,
    );

    return { ciphertexts };
  },

  /**
   * Batch decrypt multiple values
   */
  async batchDecrypt(userId: string, keyId: string, ciphertexts: string[]) {
    if (!Array.isArray(ciphertexts) || ciphertexts.length === 0) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Ciphertexts array is required",
      );
    }

    const prisma = getPrismaClient();

    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: {
                    in: [
                      "VIEW" as const,
                      "USE" as const,
                      "EDIT" as const,
                      "ADMIN" as const,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND);
    }

    const vaultKeyName = key.versions[0]?.encryptedValue;
    if (!vaultKeyName) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND, "Key version not found");
    }

    const plaintexts = await encryptionService.batchDecrypt(
      vaultKeyName,
      ciphertexts,
    );

    return { plaintexts };
  },

  /**
   * Delete a key
   */
  async deleteKey(userId: string, keyId: string) {
    const prisma = getPrismaClient();

    // Check if user has permission to delete (ADMIN level)
    const key = await prisma.key.findFirst({
      where: {
        id: keyId,
        vault: {
          OR: [
            {
              permissions: {
                some: {
                  userId,
                  permissionLevel: "ADMIN" as const,
                },
              },
            },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key) {
      throw new NotFoundError(
        ErrorCode.KEY_NOT_FOUND,
        "Key not found or insufficient permissions",
      );
    }

    const vaultKeyName = key.versions[0]?.encryptedValue;
    if (vaultKeyName) {
      // Delete key from Vault
      await encryptionService.deleteKey(vaultKeyName);
    }

    // Delete key from database (cascade will handle versions)
    await prisma.key.delete({
      where: { id: keyId },
    });

    return { success: true };
  },
};
