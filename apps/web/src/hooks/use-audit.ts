import { useQuery } from "@tanstack/react-query";
import { auditService, type GetAuditLogsParams } from "@/services/audit.service";
import { useAuthStore } from "@/store/auth.store";

export function useAuditLogs(params?: GetAuditLogsParams) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["audit-logs", user?.id, params],
    queryFn: () => auditService.getLogs(params),
    enabled: !!user, // Wait until contextual auth user is loaded
    staleTime: 1000 * 10, // 10 seconds
  });
}
