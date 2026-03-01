"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useKeys, useCreateKey, useDeleteKey, useRotateKey } from "@/hooks/use-keys";
import { useVaults } from "@/hooks/use-vaults";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, RefreshCw, Search, KeyRound, Vault, Loader2, ShieldCheck } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";

const keyTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;
type KeyType = (typeof keyTypes)[number];

export default function KeysPage() {
  const { currentVault } = useOrganizationStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState({
    name: "",
    description: "",
    valueType: "STRING" as KeyType,
    vaultId: currentVault?.id || "",
  });

  const { currentOrganization } = useOrganizationStore();
  const { data: vaults } = useVaults(currentOrganization?.id);
  const { data: keys, isLoading } = useKeys(currentVault?.id);
  const { mutate: createKey, isPending: isCreating } = useCreateKey();
  const { mutate: deleteKey } = useDeleteKey();
  const { mutate: rotateKey } = useRotateKey();

  const filteredKeys = useMemo(
    () => keys?.filter((key) => key.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [keys, searchQuery],
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
          setNewKey({ name: "", description: "", valueType: "STRING", vaultId: currentVault?.id || "" });
        },
      },
    );
  };

  if (!currentVault) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-dashed border-border/80 px-6 py-20 text-center text-muted-foreground">
          <Vault className="mx-auto mb-3 h-8 w-8" />
          Select a vault to manage keys.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <section className="cupertino-glass-panel !p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Keys</h1>
              <p className="text-[15px] font-medium text-muted-foreground mt-2">
                Vault transit-backed key lifecycle with rotation and scoped access.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1.5 text-[12px]">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                {currentVault.name}
              </Badge>
              <Button className="rounded-2xl h-11 px-6" onClick={() => setShowCreateForm((v) => !v)}>
                <Plus className="mr-2 h-5 w-5" />
                Create Key
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "grid gap-4 overflow-hidden transition-all duration-500 ease-in-out",
              showCreateForm ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"
            )}
          >
            <div className="min-h-0">
              <form onSubmit={handleCreateKey} className="grid gap-4 rounded-[20px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="key-name" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Name</Label>
                  <Input
                    id="key-name"
                    placeholder="payments-master-key"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-type" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Type</Label>
                  <select
                    id="key-type"
                    value={newKey.valueType}
                    onChange={(e) => setNewKey({ ...newKey, valueType: e.target.value as KeyType })}
                    className="h-11 w-full rounded-xl border border-black/5 dark:border-white/5 bg-background px-4 text-[14px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
                  >
                    {keyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-description" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Description</Label>
                  <Input
                    id="key-description"
                    placeholder="Used for payment tokenization"
                    value={newKey.description}
                    onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="key-vault" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Vault</Label>
                  <select
                    id="key-vault"
                    value={newKey.vaultId || currentVault?.id || ""}
                    onChange={(e) => setNewKey({ ...newKey, vaultId: e.target.value })}
                    className="h-11 w-full rounded-xl border border-black/5 dark:border-white/5 bg-background px-4 text-[14px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/40 shadow-inner disabled:opacity-50"
                    disabled={!vaults || vaults.length <= 1}
                  >
                    {vaults?.map((vault) => (
                      <option key={vault.id} value={vault.id}>
                        {vault.name}
                      </option>
                    ))}
                    {(!vaults || vaults.length === 0) && currentVault && (
                      <option value={currentVault.id}>{currentVault.name}</option>
                    )}
                  </select>
                </div>
                <div className="md:col-span-3 flex gap-3 pt-2">
                  <Button type="submit" className="h-11 rounded-xl px-8" disabled={isCreating || !newKey.name}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Key
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl px-6"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewKey({ name: "", description: "", valueType: "STRING", vaultId: currentVault?.id || "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="relative group">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-[15px] font-medium placeholder:text-muted-foreground/70 transition-all focus:bg-background shadow-glass-sm focus:shadow-glass-md"
          />
        </section>

        <section className="space-y-4">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center rounded-[24px] border border-border/70 bg-card/40 backdrop-blur-md">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredKeys && filteredKeys.length > 0 ? (
            filteredKeys.map((key) => (
              <Card key={key.id} className="cupertino-glass-panel !p-5 overflow-hidden group hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-[16px] bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-bold tracking-tight text-foreground">{key.name}</p>
                      <div className="mt-1 flex items-center gap-3">
                        <Badge variant="secondary" className="rounded-md text-[11px] px-2 py-0.5 font-bold tracking-wider">
                          {key.valueType}
                        </Badge>
                        <span className="text-[12px] font-medium text-muted-foreground">Created {formatDateTime(key.createdAt)}</span>
                      </div>
                      {key.description && (
                        <p className="mt-2 text-[14px] font-medium text-muted-foreground line-clamp-2">{key.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl" onClick={() => rotateKey(key.id)} title="Rotate key">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete key \"${key.name}\"?`)) {
                          deleteKey(key.id);
                        }
                      }}
                      title="Delete key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="rounded-[32px] border border-dashed border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] px-6 py-20 text-center flex flex-col items-center">
              <div className="h-16 w-16 mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground mb-1">
                {searchQuery ? "No keys found" : "No keys yet"}
              </h3>
              <p className="text-[14px] font-medium text-muted-foreground">
                {searchQuery ? "Try refining your search query." : "Create your first transit key to encrypt data."}
              </p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
