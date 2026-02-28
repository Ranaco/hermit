import { AuditAction, ResourceType } from "@hermes/prisma";
import { apiClient } from "@/lib/api";

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username: string;
  } | null;
}

export interface GetAuditLogsParams {
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export const auditService = {
  /**
   * Get paginated audit logs
   */
  getLogs: async (params?: GetAuditLogsParams): Promise<PaginatedAuditLogs> => {
    const { data } = await apiClient.get<{ data: PaginatedAuditLogs }>("/audit", {
      params,
    });
    return data.data;
  },
};
