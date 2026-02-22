"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useVaults, useCreateVault, useDeleteVault } from "@/hooks/use-vaults";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, Search, Vault as VaultIcon, Building2, Loader2, KeyRound } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function VaultsPage() {
  const { currentOrganization } = useOrganizationStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newVault, setNewVault] = useState({ name: "", description: "" });

  const { data: vaults, isLoading } = useVaults(currentOrganization?.id);
  const { mutate: createVault, isPending: isCreating } = useCreateVault();
  const { mutate: deleteVault } = useDeleteVault();

  const filteredVaults = useMemo(
    () => vaults?.filter((vault) => vault.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [vaults, searchQuery],
  );

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    createVault(
      {
        ...newVault,
        organizationId: currentOrganization.id,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewVault({ name: "", description: "" });
        },
      },
    );
  };

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-dashed border-border/80 px-6 py-20 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-8 w-8" />
          Select an organization to manage vaults.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="kms-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="kms-title">Vaults</h1>
              <p className="kms-subtitle mt-2">
                Isolated storage domains for keys and secrets across your organization.
              </p>
            </div>
            <Button className="rounded-xl" onClick={() => setShowCreateForm((v) => !v)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Vault
            </Button>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateVault} className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="vault-name">Name</Label>
                <Input
                  id="vault-name"
                  value={newVault.name}
                  onChange={(e) => setNewVault({ ...newVault, name: e.target.value })}
                  placeholder="production-vault"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vault-description">Description</Label>
                <Input
                  id="vault-description"
                  value={newVault.description}
                  onChange={(e) => setNewVault({ ...newVault, description: e.target.value })}
                  placeholder="Critical runtime and database secrets"
                />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" disabled={isCreating || !newVault.name}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewVault({ name: "", description: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vaults"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="md:col-span-2 xl:col-span-3 flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVaults && filteredVaults.length > 0 ? (
            filteredVaults.map((vault) => (
              <Card key={vault.id} className="kms-kpi border-border/80">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                      <VaultIcon className="h-4 w-4" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete vault \"${vault.name}\"?`)) {
                          deleteVault(vault.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardTitle className="truncate text-lg tracking-tight">{vault.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">{vault.description || "No description"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Managed keys</span>
                    <Badge variant="outline" className="rounded-md text-[11px]">
                      <KeyRound className="mr-1 h-3 w-3" />
                      {vault._count?.keys || 0}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Created {formatDateTime(vault.createdAt)}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-border/80 px-6 py-14 text-center text-muted-foreground">
              <VaultIcon className="mx-auto mb-2 h-6 w-6" />
              {searchQuery ? "No vaults match your search." : "No vaults yet. Create your first vault."}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
