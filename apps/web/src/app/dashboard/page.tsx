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
import { cn } from "@/lib/utils";

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
      <div className="space-y-8 max-w-7xl mx-auto">
        <section className="cupertino-glass-panel !p-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
            <p className="text-[15px] font-medium text-muted-foreground mt-2">
              Your key management summary and security posture.
            </p>
          </div>
          {currentOrganization ? (
            <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] shadow-inner px-5 py-3 text-sm flex flex-col items-end">
              <p className="font-bold tracking-tight text-[15px]">{currentOrganization.name}</p>
              <p className="text-[13px] font-medium text-muted-foreground mt-0.5 z-10">{currentVault ? currentVault.name : "No vault selected"}</p>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="cupertino-glass-panel hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : metric.value}
                  </p>
                </div>
                <div className={cn("rounded-2xl p-3 shadow-inner", metric.chip)}>
                  <metric.icon className={cn("h-6 w-6", metric.tone)} />
                </div>
              </div>
              <p className="mt-4 text-[13px] font-medium text-muted-foreground bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 shadow-inner inline-block w-max rounded-b-xl">{metric.hint}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="cupertino-glass-panel border-none shadow-glass-md">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-xl font-bold tracking-tight">Security Posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-2">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 shadow-inner">
                <span className="inline-flex items-center gap-3 text-[14px] font-medium text-foreground">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Vault connectivity
                </span>
                <span className="text-[12px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Healthy</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 shadow-inner">
                <span className="inline-flex items-center gap-3 text-[14px] font-medium text-foreground">
                  <Clock3 className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Last key rotation
                </span>
                <span className="text-[12px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">Within window</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 shadow-inner">
                <span className="inline-flex items-center gap-3 text-[14px] font-medium text-foreground">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Tenant isolation
                </span>
                <span className="text-[12px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">Org scoped</span>
              </div>
            </CardContent>
          </Card>

          <Card className="cupertino-glass-panel border-none shadow-glass-md">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-xl font-bold tracking-tight">Recent Activity Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-2">
              <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-4 shadow-inner">
                <p className="text-[15px] font-bold text-foreground">3 key rotations completed</p>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">All in active vault {currentVault?.name || "context"}</p>
              </div>
              <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-4 shadow-inner">
                <p className="text-[15px] font-bold text-foreground">12 secret reads with audit trail</p>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground">No unauthorized access attempts detected</p>
              </div>
              <div className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wide text-primary hover:underline hover:cursor-pointer px-2">
                Export detailed logs from the Audit Logs section
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
