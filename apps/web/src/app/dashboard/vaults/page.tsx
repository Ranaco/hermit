"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVaults, useCreateVault, useDeleteVault } from "@/hooks/use-vaults";
import { useOrganizations } from "@/hooks/use-organizations";
import { useRBAC } from "@/hooks/use-rbac";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Plus,
  Trash2,
  Search,
  Vault as VaultIcon,
  Building2,
  Loader2,
  KeyRound,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function VaultsPage() {
  const { currentOrganization } = useOrganizationStore();
  const permissions = useRBAC();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newVault, setNewVault] = useState({
    name: "",
    description: "",
    organizationId: currentOrganization?.id || "",
    password: "",
    confirmPassword: "",
  });

  const { data: organizations } = useOrganizations();
  const { data: vaults, isLoading } = useVaults(currentOrganization?.id);
  const { mutate: createVault, isPending: isCreating } = useCreateVault();
  const { mutate: deleteVault } = useDeleteVault();

  const filteredVaults = useMemo(
    () => vaults?.filter((vault) => vault.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [vaults, searchQuery],
  );

  const organizationItems = useMemo(
    () =>
      organizations?.map((org) => ({
        value: org.id,
        label: org.name,
        description: org.description || undefined,
      })) || [],
    [organizations],
  );

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrgId = newVault.organizationId || currentOrganization?.id;
    if (!targetOrgId) return;

    createVault(
      {
        name: newVault.name,
        description: newVault.description,
        organizationId: targetOrgId,
        password: newVault.password || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewVault({
            name: "",
            description: "",
            organizationId: currentOrganization?.id || "",
            password: "",
            confirmPassword: "",
          });
        },
      },
    );
  };

  const hasVaultPassword = newVault.password.length > 0;
  const vaultPasswordTooShort = hasVaultPassword && newVault.password.length < 8;
  const vaultPasswordMismatch = hasVaultPassword && newVault.password !== newVault.confirmPassword;
  const isVaultFormValid =
    !!newVault.name && !vaultPasswordTooShort && !vaultPasswordMismatch;

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="app-empty">
          <Building2 className="mx-auto mb-3 h-8 w-8" />
          Select an organization to manage vaults.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="app-page-header">
          <div className="app-page-intro">
            <p className="app-eyebrow">Vaults</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Storage boundaries
            </h1>
            <p className="app-page-copy">
              Keys and secrets are scoped here.
            </p>
          </div>

          <div className="app-toolbar">
            <Badge variant="secondary">{currentOrganization.name}</Badge>
            {permissions.canCreateVault ? (
              <Button onClick={() => setShowCreateForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                Create vault
              </Button>
            ) : null}
          </div>
        </section>

        <Dialog open={permissions.canCreateVault && showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="border-b border-border/80 px-6 py-5 sm:px-7">
              <DialogTitle>Create vault</DialogTitle>
              <DialogDescription>
                Define a storage boundary for keys and secrets.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVault} className="app-dialog-body grid gap-4 md:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="vault-org">Organization</Label>
                <Combobox
                  items={
                    organizationItems.length > 0
                      ? organizationItems
                      : currentOrganization
                        ? [{ value: currentOrganization.id, label: currentOrganization.name }]
                        : []
                  }
                  value={newVault.organizationId || currentOrganization?.id}
                  placeholder="Select organization"
                  searchPlaceholder="Search organizations..."
                  emptyText="No organizations found."
                  disabled={!organizations || organizations.length <= 1}
                  onValueChange={(value) => setNewVault({ ...newVault, organizationId: value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vault-description">Description</Label>
                <Input
                  id="vault-description"
                  value={newVault.description}
                  onChange={(e) => setNewVault({ ...newVault, description: e.target.value })}
                  placeholder="Critical runtime and database secrets"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vault-password">Vault password</Label>
                <Input
                  id="vault-password"
                  type="password"
                  value={newVault.password}
                  onChange={(e) => setNewVault({ ...newVault, password: e.target.value })}
                  placeholder="Optional, 8+ characters"
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Required to reveal secrets unless overridden at secret level.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vault-password-confirm">Confirm password</Label>
                <Input
                  id="vault-password-confirm"
                  type="password"
                  value={newVault.confirmPassword}
                  onChange={(e) => setNewVault({ ...newVault, confirmPassword: e.target.value })}
                  placeholder="Repeat vault password"
                  minLength={8}
                  disabled={!hasVaultPassword}
                />
                {vaultPasswordTooShort ? (
                  <p className="text-xs text-destructive">Vault password must be at least 8 characters.</p>
                ) : null}
                {vaultPasswordMismatch ? (
                  <p className="text-xs text-destructive">Vault passwords do not match.</p>
                ) : null}
              </div>
              <DialogFooter className="app-dialog-footer md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => {
                  setShowCreateForm(false);
                  setNewVault({
                    name: "",
                    description: "",
                    organizationId: currentOrganization?.id || "",
                    password: "",
                    confirmPassword: "",
                  });
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !isVaultFormValid}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <section className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vaults"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </section>

        <section className="app-grid-table overflow-hidden">
          <div className="app-grid-table-header grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto]">
            <p>Vault</p>
            <p>Keys</p>
            <p>Created</p>
            <p className="text-right">Actions</p>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVaults && filteredVaults.length > 0 ? (
            filteredVaults.map((vault) => (
              <div
                key={vault.id}
                className="app-grid-table-row grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <VaultIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{vault.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {vault.description || "No description"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {vault._count?.keys || 0}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{formatDateTime(vault.createdAt)}</div>
                <div className="flex justify-end">
                  {permissions.canDeleteVault ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete vault "${vault.name}"?`)) {
                          deleteVault(vault.id);
                        }
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="app-empty border-0 rounded-none">
              <VaultIcon className="mx-auto mb-3 h-8 w-8" />
              {searchQuery
                ? "No vaults match your search."
                : permissions.canCreateVault
                  ? "No vaults yet."
                  : "No vaults in this organization."}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
