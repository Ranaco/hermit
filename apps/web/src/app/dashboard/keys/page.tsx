"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKeys, useCreateKey, useDeleteKey, useRotateKey } from "@/hooks/use-keys";
import { useVaults } from "@/hooks/use-vaults";
import { useRBAC } from "@/hooks/use-rbac";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Plus,
  Trash2,
  RefreshCw,
  Search,
  KeyRound,
  Vault,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

const keyTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;
type KeyType = (typeof keyTypes)[number];

export default function KeysPage() {
  const { currentOrganization, currentVault } = useOrganizationStore();
  const permissions = useRBAC();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState({
    name: "",
    description: "",
    valueType: "STRING" as KeyType,
    vaultId: currentVault?.id || "",
  });

  const { data: vaults } = useVaults(currentOrganization?.id);
  const { data: keys, isLoading } = useKeys(currentVault?.id);
  const { mutate: createKey, isPending: isCreating } = useCreateKey();
  const { mutate: deleteKey } = useDeleteKey();
  const { mutate: rotateKey } = useRotateKey();

  const filteredKeys = useMemo(
    () => keys?.filter((key) => key.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [keys, searchQuery],
  );

  const vaultItems = useMemo(
    () =>
      vaults?.map((vault) => ({
        value: vault.id,
        label: vault.name,
        description: `${vault._count?.keys || 0} keys`,
      })) || [],
    [vaults],
  );

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVaultId = newKey.vaultId || currentVault?.id;
    if (!targetVaultId) return;

    createKey(
      {
        name: newKey.name,
        description: newKey.description,
        valueType: newKey.valueType,
        vaultId: targetVaultId,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewKey({
            name: "",
            description: "",
            valueType: "STRING",
            vaultId: currentVault?.id || "",
          });
        },
      },
    );
  };

  if (!currentVault) {
    return (
      <DashboardLayout>
        <div className="app-empty">
          <Vault className="mx-auto mb-3 h-8 w-8" />
          Select a vault to manage keys.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[58ch]">
            <p className="app-eyebrow">Keys</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Transit-backed keys
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Create and rotate keys.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              {currentVault.name}
            </Badge>
            {permissions.canCreateKey ? (
              <Button onClick={() => setShowCreateForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                Create key
              </Button>
            ) : null}
          </div>
        </section>

        <section
          className={cn(
            "overflow-hidden border-b border-border transition-all duration-200",
            permissions.canCreateKey && showCreateForm ? "max-h-[480px] pb-6 opacity-100" : "max-h-0 pb-0 opacity-0",
          )}
        >
          <form onSubmit={handleCreateKey} className="grid gap-4 pt-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="payments-master-key"
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-type">Type</Label>
              <Select
                value={newKey.valueType}
                onValueChange={(value) => setNewKey({ ...newKey, valueType: value as KeyType })}
              >
                <SelectTrigger id="key-type">
                  <SelectValue placeholder="Select key type" />
                </SelectTrigger>
                <SelectContent>
                  {keyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-description">Description</Label>
              <Input
                id="key-description"
                placeholder="Used for payment tokenization"
                value={newKey.description}
                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="key-vault">Vault</Label>
              <Combobox
                items={
                  vaultItems.length > 0
                    ? vaultItems
                    : currentVault
                      ? [{ value: currentVault.id, label: currentVault.name }]
                      : []
                }
                value={newKey.vaultId || currentVault?.id}
                placeholder="Select vault"
                searchPlaceholder="Search vaults..."
                emptyText="No vaults found."
                disabled={!vaults || vaults.length <= 1}
                onValueChange={(value) => setNewKey({ ...newKey, vaultId: value })}
              />
            </div>
            <div className="flex items-end gap-3">
              <Button type="submit" disabled={isCreating || !newKey.name}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewKey({
                    name: "",
                    description: "",
                    valueType: "STRING",
                    vaultId: currentVault?.id || "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>

        <section className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search keys"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </section>

        <section className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] gap-4 border-b border-border pb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <p>Name</p>
            <p>Type</p>
            <p>Created</p>
            <p className="text-right">Actions</p>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center border-b border-border">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKeys && filteredKeys.length > 0 ? (
            filteredKeys.map((key) => (
              <div
                key={key.id}
                className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] gap-4 border-b border-border py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{key.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {key.description || "No description"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{key.valueType}</div>
                <div className="text-sm text-muted-foreground">{formatDateTime(key.createdAt)}</div>
                <div className="flex items-center justify-end gap-2">
                  {permissions.canRotateKey ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => rotateKey(key.id)}
                      title="Rotate key"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {permissions.canDeleteKey ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete key "${key.name}"?`)) {
                          deleteKey(key.id);
                        }
                      }}
                      title="Delete key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="app-empty">
              <KeyRound className="mx-auto mb-3 h-8 w-8" />
              {searchQuery
                ? "No keys match your search."
                : permissions.canCreateKey
                  ? "No keys yet. Create the first key for this vault."
                  : "No keys available in this vault."}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
