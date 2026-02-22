"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useKeys, useCreateKey, useDeleteKey, useRotateKey } from "@/hooks/use-keys";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, RefreshCw, Search, KeyRound, Vault, Loader2, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

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
  });

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
    if (!currentVault) return;

    createKey(
      {
        ...newKey,
        vaultId: currentVault.id,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewKey({ name: "", description: "", valueType: "STRING" });
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
      <div className="space-y-6">
        <section className="kms-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="kms-title">Keys</h1>
              <p className="kms-subtitle mt-2">
                Vault transit-backed key lifecycle with rotation and scoped access.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-lg px-2 py-1 text-xs">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {currentVault.name}
              </Badge>
              <Button className="rounded-xl" onClick={() => setShowCreateForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            </div>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateKey} className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 md:grid-cols-3">
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
                <select
                  id="key-type"
                  value={newKey.valueType}
                  onChange={(e) => setNewKey({ ...newKey, valueType: e.target.value as KeyType })}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  {keyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" disabled={isCreating || !newKey.name}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKey({ name: "", description: "", valueType: "STRING" });
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
            placeholder="Search keys"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </section>

        <section className="space-y-3">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKeys && filteredKeys.length > 0 ? (
            filteredKeys.map((key) => (
              <Card key={key.id} className="kms-surface border-border/80">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium tracking-tight">{key.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-md text-[11px]">
                            {key.valueType}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{key.description || "No description"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(key.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => rotateKey(key.id)} title="Rotate key">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
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
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 px-6 py-14 text-center text-muted-foreground">
              <KeyRound className="mx-auto mb-2 h-6 w-6" />
              {searchQuery ? "No keys match your search." : "No keys yet. Create your first key."}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
