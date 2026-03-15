import { z } from "zod";
import { AuditAction, ResourceType } from "@hermit/prisma";

export const getAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  vaultId: z.string().uuid().optional(),
  resourceType: z.nativeEnum(ResourceType).optional(),
  resourceId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type GetAuditLogsInput = z.infer<typeof getAuditLogsSchema>;
