"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, KeyRound, Vault } from "lucide-react";

const mockPolicies = [
  {
    id: "pol-core-admin",
    name: "Core Platform Admin",
    scope: "Organization",
    teams: ["Platform", "Security"],
    permissions: ["vault.admin", "key.rotate", "secret.reveal"],
  },
  {
    id: "pol-runtime-read",
    name: "Runtime Read Access",
    scope: "Production Vault",
    teams: ["SRE"],
    permissions: ["secret.read", "key.encrypt"],
  },
];

export default function PoliciesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="kms-title">Access Policies</h1>
            <p className="kms-subtitle mt-2">Human-readable policy controls mapped to Vault capabilities.</p>
          </div>
          <Button className="rounded-xl">Create Policy</Button>
        </div>

        <div className="grid gap-4">
          {mockPolicies.map((policy) => (
            <Card key={policy.id} className="kms-surface border-border/80">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{policy.name}</CardTitle>
                    <CardDescription className="mt-1">ID: {policy.id}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-3">{policy.scope}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  {policy.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="rounded-full px-3">{permission}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {policy.teams.join(", ")}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Vault className="h-3.5 w-3.5" /> Vault mapped</span>
                  <span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Transit-aware</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
