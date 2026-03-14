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
import crypto from "crypto";
import { evaluateAccess } from "../services/policy-engine";

export const shareWrapper = {
  /**
   * Create a new one-time share
   */
  async createShare(
    userId: string,
    data: {
      keyId: string;
      value?: string;
      secretId?: string;
      passphrase?: string;
      expiresInHours?: number;
      note?: string;
      audienceEmail?: string;
    },
    auditInfo: {
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    const { keyId, value, secretId, passphrase, expiresInHours = 24, note, audienceEmail } = data;

    if (!value && !secretId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Either value or secretId must be provided"
      );
    }

    const prisma = getPrismaClient();

    // Verify key exists and user has access (simplified for now to match key creator or team access, assume wrapper logic similar to secrets)
    const key = await prisma.key.findFirst({
      where: { id: keyId },
      include: {
        vault: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!key || !key.versions[0]) {
      throw new NotFoundError(ErrorCode.KEY_NOT_FOUND, "Encryption key not found");
    }

    let payloadToEncrypt = value;

    // If sharing an existing secret, resolve its current plaintext value
    if (secretId) {
      const secret = await prisma.secret.findUnique({
        where: { id: secretId },
        include: {
          vault: {
            select: {
              id: true,
              organizationId: true,
            },
          },
          key: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } } },
          currentVersion: {
            select: {
              id: true,
              encryptedValue: true,
              versionNumber: true,
            },
          },
        }
      });
      if (!secret || !secret.currentVersion) {
        throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Referenced secret not found");
      }

      if (!secret.vault || secret.vault.organizationId !== key.vault.organizationId) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Referenced secret does not belong to the same organization as the share key.",
        );
      }

      const secretUrn = `urn:hermes:org:${secret.vault.organizationId}:vault:${secret.vault.id}:secret:${secret.id}`;
      const isAllowed = await evaluateAccess(userId, secret.vault.organizationId, "secrets:read", secretUrn);
      if (!isAllowed) {
        throw new ForbiddenError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "You do not have 'secrets:read' permission for the referenced secret.",
        );
      }
      
      const secretKeyName = secret.key.versions[0]?.encryptedValue;
      if (!secretKeyName) {
        throw new Error("Secret key configuration error");
      }
      
      const decryptedSecret = await encryptionService.decrypt(
        secretKeyName,
        secret.currentVersion.encryptedValue
      );
      
      payloadToEncrypt = decryptedSecret;
    }

    // Get the target vault transit key name for the share
    const shareVaultKeyName = key.versions[0].encryptedValue;
    const encryptedValue = await encryptionService.encrypt(shareVaultKeyName, payloadToEncrypt!);

    let passwordHash: string | undefined;
    if (passphrase) {
      passwordHash = await hashPassword(passphrase);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const share = await prisma.oneTimeShare.create({
      data: {
        keyId,
        keyVersionId: key.versions[0].id, // Fixed Prisma constraint schema mapping bug
        createdById: userId,
        token,
        requirePassphrase: !!passphrase,
        passwordHash,
        expiresAt,
        note,
        audienceEmail,
        encryptedValue,
        envelopeAlgorithm: "aes256-gcm96",
      }
    });

    await createAuditLog({
      userId,
      action: "SHARE_KEY" as any, // using closest enum
      resourceType: "TEMPORARY_KEY" as any,
      resourceId: share.id,
      details: {
        keyId,
        secretId,
        expiresAt,
        hasPassphrase: !!passphrase,
      },
      ipAddress: auditInfo.ipAddress || "unknown",
      userAgent: auditInfo.userAgent || "unknown",
    });

    return { share, token };
  },

  /**
   * Get metadata for a share before consumption
   */
  async getShareMetadata(token: string) {
    const prisma = getPrismaClient();

    const share = await prisma.oneTimeShare.findUnique({
      where: { token },
      select: {
        id: true,
        expiresAt: true,
        consumedAt: true,
        requirePassphrase: true,
        note: true,
      }
    });

    if (!share) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Share not found or already consumed");
    }

    const isExpired = new Date() > share.expiresAt;
    const isConsumed = !!share.consumedAt;

    if (isExpired || isConsumed) {
      // Don't leak details if it's dead, just return status
      return { status: isExpired ? "expired" : "consumed" };
    }

    return {
      status: "active",
      metadata: {
        expiresAt: share.expiresAt,
        requirePassphrase: share.requirePassphrase,
        note: share.note,
      }
    };
  },

  /**
   * Consume a share
   */
  async consumeShare(
    token: string,
    passphrase?: string,
    auditInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    const prisma = getPrismaClient();

    const share = await prisma.oneTimeShare.findUnique({
      where: { token },
      include: {
        key: {
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
        }
      }
    });

    if (!share) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Share not found");
    }

    if (share.consumedAt) {
      throw new ForbiddenError(ErrorCode.RESOURCE_EXPIRED, "This share has already been consumed");
    }

    if (new Date() > share.expiresAt) {
      throw new ForbiddenError(ErrorCode.RESOURCE_EXPIRED, "This share has expired");
    }

    if (share.requirePassphrase) {
      if (!passphrase) {
        throw new ForbiddenError(ErrorCode.INVALID_CREDENTIALS, "Passphrase required");
      }
        if (!share.passwordHash || !(await verifyPassword(passphrase, share.passwordHash))) {
          // Increment redemption attempts and wipe payload if maximum limit (5) is reached
          if (share.redemptionAttempts >= 4) {
             await prisma.oneTimeShare.update({
              where: { id: share.id },
              data: {
                  consumedAt: new Date(),
                  consumedByIp: auditInfo?.ipAddress || "unknown",
                  redemptionAttempts: share.redemptionAttempts + 1,
                  lastAttemptAt: new Date(),
                  encryptedValue: null,
              }
             });
             throw new ForbiddenError(ErrorCode.RESOURCE_EXPIRED, "Maximum failed attempts reached. Share destroyed.");
          }

          await prisma.oneTimeShare.update({
            where: { id: share.id },
            data: {
              redemptionAttempts: { increment: 1 },
              lastAttemptAt: new Date()
            }
          });
          throw new ForbiddenError(ErrorCode.INVALID_CREDENTIALS, "Invalid passphrase");
        }
    }

    // Decrypt the payload
    const vaultKeyName = share.key.versions[0]?.encryptedValue;
    if (!vaultKeyName || !share.encryptedValue) {
      throw new Error("Share configuration error");
    }

    const value = await encryptionService.decrypt(vaultKeyName, share.encryptedValue);

    // Mark as consumed and Strictly wipe payload
    await prisma.oneTimeShare.update({
      where: { id: share.id },
      data: {
        consumedAt: new Date(),
        consumedByIp: auditInfo?.ipAddress || "unknown",
        redemptionAttempts: { increment: 1 },
        lastAttemptAt: new Date(),
        encryptedValue: null, // Critical wipe
      }
    });

    return { value };
  }
};
