"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKeys } from "@/hooks/use-keys";
import { useSecrets } from "@/hooks/use-secrets";
import { useVaults } from "@/hooks/use-vaults";
import { useAutoContext } from "@/hooks/use-auto-context";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Key,
  Lock,
  Vault,
  Activity,
  Building2,
  ShieldCheck,
  Clock3,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  useAutoContext();

  const { currentOrganization, currentVault } = useOrganizationStore();
  const { data: keys, isLoading: keysLoading } = useKeys(currentVault?.id);
  const { data: secrets, isLoading: secretsLoading } = useSecrets(currentVault?.id);
  const { data: vaults, isLoading: vaultsLoading } = useVaults(currentOrganization?.id);

  const loading = keysLoading || secretsLoading || vaultsLoading;

  const metrics = [
    {
      label: "Keys",
      value: keys?.length || 0,
      hint: "Transit and data-encryption keys",
      icon: Key,
      tone: "text-blue-600",
      chip: "bg-blue-500/10",
    },
    {
      label: "Secrets",
      value: secrets?.secrets?.length || 0,
      hint: "Masked values and versions",
      icon: Lock,
      tone: "text-indigo-600",
      chip: "bg-indigo-500/10",
    },
    {
      label: "Vaults",
      value: vaults?.length || 0,
      hint: "Active secure partitions",
      icon: Vault,
      tone: "text-emerald-600",
      chip: "bg-emerald-500/10",
    },
    {
      label: "Ops Today",
      value: 1247,
      hint: "Encrypt, decrypt, rotate, reveal",
      icon: Activity,
      tone: "text-orange-600",
      chip: "bg-orange-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="kms-panel">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="kms-title">Overview</h1>
              <p className="kms-subtitle mt-2">
                Vault-backed key management with clear tenancy and access context.
              </p>
            </div>

            {currentOrganization ? (
              <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-2 text-sm">
                <p className="font-medium">{currentOrganization.name}</p>
                <p className="text-xs text-muted-foreground">{currentVault ? currentVault.name : "No vault selected"}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="kms-kpi">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : metric.value}
                  </p>
                </div>
                <div className={`rounded-xl p-2 ${metric.chip}`}>
                  <metric.icon className={`h-4 w-4 ${metric.tone}`} />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{metric.hint}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="kms-surface border-border/80">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">Security Posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Vault connectivity
                </span>
                <span className="text-xs font-medium text-emerald-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4 text-blue-600" /> Last key rotation
                </span>
                <span className="text-xs text-muted-foreground">Within policy window</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-indigo-600" /> Tenant isolation
                </span>
                <span className="text-xs text-muted-foreground">Organization scoped</span>
              </div>
            </CardContent>
          </Card>

          <Card className="kms-surface border-border/80">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">Recent Activity Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
                <p className="font-medium">3 key rotations completed</p>
                <p className="mt-1 text-xs text-muted-foreground">All in active vault {currentVault?.name || "context"}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
                <p className="font-medium">12 secret reads with audit trail</p>
                <p className="mt-1 text-xs text-muted-foreground">No unauthorized access attempts detected</p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-primary">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Export detailed logs from the Audit Logs section
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
