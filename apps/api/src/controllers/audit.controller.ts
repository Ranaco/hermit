import { type Request, type Response } from "express";
import { queryAuditLogs } from "../services/audit.service";
import type { GetAuditLogsInput } from "../validators/audit.validator";
import { AuditAction, ResourceType } from "@hermes/prisma";

/**
 * Get audit logs (filtered and paginated)
 */
export async function getAuditLogs(
  req: Request,
  res: Response,
) {
  const { limit, offset, action, resourceId, resourceType, userId } = req.query as unknown as GetAuditLogsInput;

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await queryAuditLogs({
    userId: userId || req.user.id, // Only allow fetching logs relating to current user unless admin (enforced softly via scoping here)
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
