"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Download, Filter, Search, ShieldCheck } from "lucide-react";

const rows = [
  {
    time: "2026-02-22T11:04:51Z",
    actor: "sre@acme.io",
    resource: "secret/prod/api_key",
    action: "SECRET_REVEAL",
    result: "SUCCESS",
    requestId: "vault-req-8a31",
  },
  {
    time: "2026-02-22T10:58:02Z",
    actor: "platform@acme.io",
    resource: "key/prod/customer-data",
    action: "KEY_ROTATE",
    result: "SUCCESS",
    requestId: "vault-req-8a2f",
  },
  {
    time: "2026-02-22T10:42:11Z",
    actor: "unknown",
    resource: "secret/prod/payments/token",
    action: "SECRET_REVEAL",
    result: "DENIED",
    requestId: "vault-req-8a22",
  },
];

export default function AuditPage() {
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

        <Card className="kms-surface border-border/80">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Narrow by actor, resource, action, and time window.</CardDescription>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 rounded-xl" placeholder="Search actor or resource" />
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
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="py-3 pr-3 font-medium">Time</th>
                    <th className="py-3 pr-3 font-medium">Actor</th>
                    <th className="py-3 pr-3 font-medium">Resource</th>
                    <th className="py-3 pr-3 font-medium">Action</th>
                    <th className="py-3 pr-3 font-medium">Result</th>
                    <th className="py-3 font-medium">Vault Request</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.requestId}-${row.time}`} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{row.time}</td>
                      <td className="py-3 pr-3">{row.actor}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{row.resource}</td>
                      <td className="py-3 pr-3">{row.action}</td>
                      <td className="py-3 pr-3">
                        <Badge
                          className="rounded-full"
                          variant={row.result === "SUCCESS" ? "secondary" : "destructive"}
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          {row.result}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-xs">{row.requestId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
