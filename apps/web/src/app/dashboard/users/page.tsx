"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { useOrganizationStore } from "@/store/organization.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Shield,
  UserCheck,
  Users as UsersIcon,
} from "lucide-react";

export default function UsersPage() {
  const { currentOrganization } = useOrganizationStore();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[58ch]">
            <p className="app-eyebrow">Users</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Identity posture
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Current operator posture.
            </p>
          </div>

          <div className="text-sm leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">
              {currentOrganization?.name || "No organization selected"}
            </p>
            <p>Tenant scoped.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Active operators", "42", "In the current organization."],
            ["Privileged roles", "8", "Elevated assignments."],
            ["MFA coverage", "91%", "Protected identities."],
          ].map(([label, value, body]) => (
            <div key={label} className="border-b border-border pb-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{value}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="inline-flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Identity readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between border-b border-border py-3 text-sm">
                <span className="inline-flex items-center gap-3 font-medium text-foreground">
                  <UserCheck className="h-4 w-4" />
                  Role lifecycle policy
                </span>
                <Badge variant="secondary">Ready</Badge>
              </div>
              <div className="flex items-center justify-between border-b border-border py-3 text-sm">
                <span className="inline-flex items-center gap-3 font-medium text-foreground">
                  <Shield className="h-4 w-4" />
                  Team-based permissions
                </span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="inline-flex items-center gap-3 font-medium text-foreground">
                  <Clock3 className="h-4 w-4" />
                  Dormant account review
                </span>
                <Badge variant="outline">Scheduled</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Recommended follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="border-b border-border pb-4">
                <p className="text-base font-medium tracking-tight text-foreground">
                  Audit privileged membership monthly
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keep OWNER and ADMIN assignments tight.
                </p>
              </div>
              <div className="border-b border-border pb-4">
                <p className="text-base font-medium tracking-tight text-foreground">
                  Expand identity analytics
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Track dormant operators and policy drift.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                Continue in Teams & Organizations
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
