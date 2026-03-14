import { useQuery } from "@tanstack/react-query";
import { auditService, type GetAuditLogsParams } from "@/services/audit.service";
import { useAuthStore } from "@/store/auth.store";

export function useAuditLogs(params?: GetAuditLogsParams, enabled = true) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["audit-logs", user?.id, params],
    queryFn: () => auditService.getLogs(params),
    enabled: !!user && enabled,
    staleTime: 1000 * 10, // 10 seconds
  });
}
