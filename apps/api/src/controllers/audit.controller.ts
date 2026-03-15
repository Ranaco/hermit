import { type Request, type Response } from "express";
import { queryAuditLogs } from "../services/audit.service";
import type { GetAuditLogsInput } from "../validators/audit.validator";
import { AuditAction, ResourceType } from "@hermit/prisma";
import getPrismaClient from "../services/prisma.service";

/**
 * Get audit logs (filtered and paginated)
 */
export async function getAuditLogs(
  req: Request,
  res: Response,
) {
  const {
    limit,
    offset,
    action,
    resourceId,
    resourceType,
    userId,
    organizationId,
    vaultId,
  } = req.query as unknown as GetAuditLogsInput;

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const prisma = getPrismaClient();
  if (organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.id,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (vaultId) {
      const vault = await prisma.vault.findFirst({
        where: {
          id: vaultId,
          organizationId,
        },
        select: { id: true },
      });

      if (!vault) {
        res.status(404).json({ error: "Vault not found in organization" });
        return;
      }
    }
  }

  const result = await queryAuditLogs({
    userId: organizationId ? undefined : userId || req.user.id,
    organizationId,
    vaultId,
    action: action ? (action as AuditAction) : undefined,
    resourceType: resourceType ? (resourceType as ResourceType) : undefined,
    resourceId,
    limit: Number(limit),
    offset: Number(offset),
  });

  res.json({
    data: {
      logs: result.logs,
      total: result.total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
}
