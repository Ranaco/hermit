"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Download, Filter, Search, ShieldCheck, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuditLogs } from "@/hooks/use-audit";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 20;

export default function AuditPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Calculate offset for Prisma based on current page
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Passing search into resourceId since email isn't supported as query filter in `getLogs` directly right now, but resourceId acts as a loose fuzzy search in Prisma `queryAuditLogs` implementation if customized, or strictly.
  // Given Prisma's Audit controller allows querying exact `userId`, we can default this text as a catch-all if we really wanted or restrict it.
  const { data: auditData, isLoading } = useAuditLogs({ 
    limit: ITEMS_PER_PAGE, 
    offset,
    ...(searchQuery ? { resourceId: searchQuery } : {})
  });
  
  const logs = auditData?.logs || [];
  const totalLogs = auditData?.total || 0;
  
  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="kms-title">Audit Logs</h1>
            <p className="kms-subtitle mt-2">Trace who accessed what, when, and how Vault responded.</p>
          </div>
          <Button variant="outline" className="rounded-xl">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <Card className="kms-surface border-border/80 flex flex-col h-[calc(100vh-140px)]">
          <CardHeader className="space-y-3 shrink-0">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Narrow by actor, resource, action, and time window.</CardDescription>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  className="pl-9 rounded-xl" 
                  placeholder="Search actor or resource" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="justify-start rounded-xl">
                <Filter className="mr-2 h-4 w-4" />
                Action Filter
              </Button>
              <Button variant="outline" className="justify-start rounded-xl">
                <CalendarDays className="mr-2 h-4 w-4" />
                Last 24 hours
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 overflow-hidden p-0 relative">
            <div className="overflow-auto flex-1">
              {isLoading ? (
                <div className="flex justify-center p-8 absolute inset-0 items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length > 0 ? (
                <div className="px-6"> 
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card/90 backdrop-blur z-10">
                      <tr className="border-b border-border/80 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="py-3 pr-3 font-medium">Time</th>
                        <th className="py-3 pr-3 font-medium">Actor</th>
                        <th className="py-3 pr-3 font-medium">Resource</th>
                        <th className="py-3 pr-3 font-medium">Action</th>
                        <th className="py-3 pr-3 font-medium">Result</th>
                        <th className="py-3 font-medium">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((row) => (
                        <tr key={row.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                          <td className="py-3 pr-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(row.createdAt), "MMM d, yyyy HH:mm:ss")}
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
                            {row.user?.email || row.userId || "System"}
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground truncate max-w-[200px]" title={row.resourceId || ""}>
                            {row.resourceType} {row.resourceId ? `(${row.resourceId.substring(0, 8)}...)` : ""}
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
                            <Badge variant="outline" className="bg-background">
                              {row.action}
                            </Badge>
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
                            {row.details?.success === false || row.action === 'LOGIN_FAILED' ? (
                              <Badge className="rounded-full" variant="destructive">
                                FAILED
                              </Badge>
                            ) : (
                              <Badge className="rounded-full" variant="secondary">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                SUCCESS
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {row.ipAddress || "unknown"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground absolute inset-0 flex items-center justify-center">
                  No audit logs found for your organization yet.
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-card shrink-0">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{offset + 1}</span> to <span className="font-medium text-foreground">{Math.min(offset + ITEMS_PER_PAGE, totalLogs)}</span> of <span className="font-medium text-foreground">{totalLogs}</span> entries
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
