"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  ScrollText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditLogs } from "@/hooks/use-audit";
import { useOrganizationStore } from "@/store/organization.store";

const ITEMS_PER_PAGE = 20;

export default function AuditPage() {
  const { currentOrganization } = useOrganizationStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const { data: auditData, isLoading } = useAuditLogs({
    limit: ITEMS_PER_PAGE,
    offset,
    ...(searchQuery ? { resourceId: searchQuery } : {}),
  });

  const logs = auditData?.logs || [];
  const totalLogs = auditData?.total || 0;
  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="app-empty">
          <Building2 className="mx-auto mb-4 h-10 w-10" />
          <p className="text-lg font-semibold tracking-tight text-foreground">
            Select an organization to view audit history
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-7 text-muted-foreground">
            Audit logs are organization-scoped.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[58ch]">
            <p className="app-eyebrow">Audit</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Audit trail
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Review recorded activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              {currentOrganization.name}
            </Badge>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search actor or resource"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="justify-start">
            <Filter className="mr-2 h-4 w-4" />
            Action filter
          </Button>
          <Button variant="outline" className="justify-start">
            <CalendarDays className="mr-2 h-4 w-4" />
            Last 24 hours
          </Button>
        </section>

        {isLoading ? (
          <div className="flex min-h-[440px] items-center justify-center border-y border-border">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto border-y border-border">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">IP address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {format(new Date(row.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {row.user?.email || row.userId || "System"}
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-muted-foreground" title={row.resourceId || ""}>
                      <div className="truncate">
                        {row.resourceType}
                        {row.resourceId ? ` (${row.resourceId.slice(0, 8)}...)` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant="outline">{row.action}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.details?.success === false || row.action === "LOGIN_FAILED" ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge variant="secondary">Success</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.ipAddress || "unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="app-empty">
            <ScrollText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-lg font-semibold tracking-tight text-foreground">No audit entries yet</p>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-7 text-muted-foreground">
              Activity will appear here.
            </p>
          </div>
        )}

        {!isLoading && totalPages > 1 ? (
          <div className="flex flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
            <div className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{offset + 1}</span> to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(offset + ITEMS_PER_PAGE, totalLogs)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalLogs}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <div className="px-2 text-sm font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
