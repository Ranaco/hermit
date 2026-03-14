/**
 * Audit Service
 * Comprehensive audit logging for all security-sensitive operations
 */

import { AuditAction, ResourceType } from "@hermes/prisma";
import getPrismaClient from "./prisma.service";
import { log } from "@hermes/logger";

export interface AuditLogData {
  userId?: string;
  organizationId?: string;
  vaultId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const prisma = getPrismaClient();

    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        vaultId: data.vaultId,
        action: data.action,
        resourceType: data.resourceType as any,
        resourceId: data.resourceId,
        details: data.details as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    log.info("Audit log created", {
      action: data.action,
      resourceType: data.resourceType,
      userId: data.userId,
      organizationId: data.organizationId,
      vaultId: data.vaultId,
    });
  } catch (error) {
    // Don't throw errors from audit logging - just log them
    log.error("Failed to create audit log", { error, data });
  }
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  organizationId?: string;
  vaultId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const prisma = getPrismaClient();

  const where: {
    userId?: string;
    organizationId?: string;
    vaultId?: string;
    resourceType?: ResourceType;
    resourceId?: string;
    action?: AuditAction;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.organizationId) where.organizationId = filters.organizationId;
  if (filters.vaultId) where.vaultId = filters.vaultId;
  if (filters.resourceType) where.resourceType = filters.resourceType;
  if (filters.resourceId) where.resourceId = filters.resourceId;
  if (filters.action) where.action = filters.action;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where: where as any }),
  ]);

  return { logs, total };
}

/**
 * Audit log helper functions for common operations
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  try {
    const prisma = getPrismaClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    log.info(`Cleaned up ${result.count} old audit logs`, { retentionDays });
    return result.count;
  } catch (error) {
    log.error("Failed to cleanup old audit logs", { error });
    return 0;
  }
}
export const auditLog = {
  login: (userId: string, ipAddress: string, userAgent: string) =>
    createAuditLog({
      userId,
      action: AuditAction.LOGIN,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: { success: true },
      ipAddress,
      userAgent,
    }),

  loginFailed: (
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ) =>
    createAuditLog({
      action: AuditAction.LOGIN_FAILED,
      resourceType: ResourceType.USER,
      details: { email, reason },
      ipAddress,
      userAgent,
    }),

  logout: (userId: string, ipAddress: string, userAgent: string) =>
    createAuditLog({
      userId,
      action: AuditAction.LOGOUT,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: {},
      ipAddress,
      userAgent,
    }),

  createKey: (
    userId: string,
    keyId: string,
    vaultId: string,
    details: Record<string, unknown>,
  ) =>
    createAuditLog({
      userId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.KEY,
      resourceId: keyId,
      details: { vaultId, ...details },
    }),

  rotateKey: (
    userId: string,
    keyId: string,
    oldVersion: number,
    newVersion: number,
  ) =>
    createAuditLog({
      userId,
      action: AuditAction.ROTATE_KEY,
      resourceType: ResourceType.KEY,
      resourceId: keyId,
      details: { oldVersion, newVersion },
    }),

  shareKey: (
    userId: string,
    keyId: string,
    shareWith: string,
    expiresAt: Date,
  ) =>
    createAuditLog({
      userId,
      action: AuditAction.SHARE_KEY,
      resourceType: ResourceType.KEY,
      resourceId: keyId,
      details: { shareWith, expiresAt },
    }),

  enable2FA: (userId: string, method: string) =>
    createAuditLog({
      userId,
      action: AuditAction.ENABLE_2FA,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: { method },
    }),

  disable2FA: (userId: string) =>
    createAuditLog({
      userId,
      action: AuditAction.DISABLE_2FA,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: {},
    }),

  addDevice: (
    userId: string,
    deviceId: string,
    deviceInfo: Record<string, unknown>,
  ) =>
    createAuditLog({
      userId,
      action: AuditAction.ADD_DEVICE,
      resourceType: ResourceType.DEVICE,
      resourceId: deviceId,
      details: deviceInfo,
    }),

  removeDevice: (userId: string, deviceId: string) =>
    createAuditLog({
      userId,
      action: AuditAction.REMOVE_DEVICE,
      resourceType: ResourceType.DEVICE,
      resourceId: deviceId,
      details: {},
    }),
};
