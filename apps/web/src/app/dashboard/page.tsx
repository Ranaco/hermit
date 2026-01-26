"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useKeys } from "@/hooks/use-keys";
import { useSecrets } from "@/hooks/use-secrets";
import { useVaults } from "@/hooks/use-vaults";
import { useAutoContext } from "@/hooks/use-auto-context";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Key,
  Lock,
  Vault,
  TrendingUp,
  Activity,
  Building2,
} from "lucide-react";

export default function DashboardPage() {
  // Auto-select organization and vault if none selected
  useAutoContext();
  
  const { currentOrganization, currentVault } = useOrganizationStore();
  const { data: keys, isLoading: keysLoading } = useKeys(currentVault?.id);
  const { data: secrets, isLoading: secretsLoading } = useSecrets(
    currentVault?.id,
  );
  const { data: vaults, isLoading: vaultsLoading } = useVaults(
    currentOrganization?.id,
  );

  const stats = [
    {
      name: "Total Keys",
      value: keys?.length || 0,
      icon: Key,
      change: "+12%",
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      name: "Total Secrets",
      value: secrets?.secrets?.length || 0,
      icon: Lock,
      change: "+8%",
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      name: "Total Vaults",
      value: vaults?.length || 0,
      icon: Vault,
      change: "+3%",
      color: "text-chart-3",
    },
    {
      name: "Operations Today",
      value: 1247,
      icon: Activity,
      change: "+18%",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome back! Here's what's happening with your KMS.
          </p>
          {currentOrganization && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted/50 border-2 border-border rounded-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{currentOrganization.name}</p>
                {currentOrganization.description && (
                  <p className="text-sm text-muted-foreground">
                    {currentOrganization.description}
                  </p>
                )}
              </div>
              {currentVault && (
                <>
                  <div className="mx-2 text-muted-foreground">•</div>
                  <Vault className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{currentVault.name}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card
              key={stat.name}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 ${stat.bg} border-2 border-border`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {keysLoading || secretsLoading || vaultsLoading ? (
                    <span className="text-muted-foreground">...</span>
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-chart-4" />
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Recent Keys</CardTitle>
              <CardDescription>
                {currentVault
                  ? `Latest encryption keys in ${currentVault.name}`
                  : "Select a vault to view keys"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : keys && keys.length > 0 ? (
                <div className="space-y-3">
                  {keys.slice(0, 5).map((key) => (
                    <div
                      key={key.id}
                      className="p-3 border-2 border-border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {key.valueType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {currentVault
                    ? "No keys found"
                    : "Select a vault to view keys"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Active Vaults</CardTitle>
              <CardDescription>
                {currentOrganization
                  ? `Your secure storage vaults in ${currentOrganization.name}`
                  : "Select an organization to view vaults"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vaultsLoading ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : vaults && vaults.length > 0 ? (
                <div className="space-y-3">
                  {vaults.slice(0, 5).map((vault) => (
                    <div
                      key={vault.id}
                      className="p-3 border-2 border-border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{vault.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {vault.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {currentOrganization
                    ? "No vaults found"
                    : "Select an organization to view vaults"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
