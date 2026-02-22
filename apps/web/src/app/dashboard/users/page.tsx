"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Shield, Clock3, UserCheck } from "lucide-react";

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="kms-panel">
          <h1 className="kms-title">Users</h1>
          <p className="kms-subtitle mt-2">
            Review identities, role assignment posture, and account activity health.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="kms-kpi">
            <p className="text-sm text-muted-foreground">Active users</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">42</p>
            <p className="mt-2 text-xs text-muted-foreground">Across current organization</p>
          </article>
          <article className="kms-kpi">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">8</p>
            <p className="mt-2 text-xs text-muted-foreground">Privileged access accounts</p>
          </article>
          <article className="kms-kpi">
            <p className="text-sm text-muted-foreground">MFA coverage</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">91%</p>
            <p className="mt-2 text-xs text-muted-foreground">Security baseline compliance</p>
          </article>
        </section>

        <Card className="kms-surface border-border/80">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg tracking-tight">
              <UsersIcon className="h-4 w-4 text-blue-600" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2"><UserCheck className="h-4 w-4 text-emerald-600" /> Role lifecycle policy</span>
              <Badge variant="secondary" className="rounded-md">Ready</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-indigo-600" /> Team-based permissions</span>
              <Badge variant="secondary" className="rounded-md">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-orange-500" /> Dormant account review</span>
              <Badge variant="outline" className="rounded-md">Scheduled</Badge>
            </div>
            <p className="pt-2 text-sm text-muted-foreground">
              Direct inline user administration can be expanded here once you want full identity CRUD in this panel.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
