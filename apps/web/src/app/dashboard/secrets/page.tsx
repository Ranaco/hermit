"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSecrets, useCreateSecret, useDeleteSecret } from "@/hooks/use-secrets";
import { secretService } from "@/services/secret.service";
import { useKeys } from "@/hooks/use-keys";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, Search, Lock, Eye, EyeOff, Vault, KeyRound, Loader2, Copy } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function SecretsPage() {
  const { currentVault } = useOrganizationStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState("");
  const [isRevealing, setIsRevealing] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState({
    name: "",
    description: "",
    value: "",
    keyId: "",
    password: "",
  });

  const { data: secrets, isLoading: secretsLoading } = useSecrets(currentVault?.id);
  const { data: keys } = useKeys(currentVault?.id);
  const { mutate: createSecret, isPending: isCreating } = useCreateSecret();
  const { mutate: deleteSecret } = useDeleteSecret();

  const filteredSecrets = useMemo(
    () => secrets?.secrets?.filter((secret) => secret.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [secrets?.secrets, searchQuery],
  );

  const toggleSecretVisibility = async (secretId: string, providedPassword?: string) => {
    const nextVisible = new Set(visibleSecrets);

    if (nextVisible.has(secretId) && !providedPassword) {
      nextVisible.delete(secretId);
      setVisibleSecrets(nextVisible);
      setRevealedSecrets((prev) => {
        const updated = { ...prev };
        delete updated[secretId];
        return updated;
      });
      setActivePrompt(null);
      setRevealPassword("");
      return;
    }

    setIsRevealing(secretId);
    try {
      const response = await secretService.reveal(secretId, { password: providedPassword });
      
      if (response.requiresPassword) {
        setActivePrompt(secretId);
        if (providedPassword) {
          toast.error("Incorrect password");
          setRevealPassword("");
        }
      } else if (response.secret?.value) {
        nextVisible.add(secretId);
        setVisibleSecrets(nextVisible);
        setRevealedSecrets((prev) => ({ ...prev, [secretId]: response.secret?.value || "" }));
        setActivePrompt(null);
        setRevealPassword("");
      } else {
        toast.error("Unable to reveal secret value");
      }
    } catch (error) {
      toast.error("Failed to reveal secret");
    } finally {
      setIsRevealing(null);
    }
  };

  const copySecret = async (secretId: string) => {
    const value = revealedSecrets[secretId];
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Secret copied");
  };

  const handleCreateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVault) return;

    createSecret(
      {
        ...newSecret,
        password: newSecret.password || undefined,
        vaultId: currentVault.id,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewSecret({ name: "", description: "", value: "", keyId: "", password: "" });
        },
      },
    );
  };

  if (!currentVault) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-dashed border-border/80 px-6 py-20 text-center text-muted-foreground">
          <Vault className="mx-auto mb-3 h-8 w-8" />
          Select a vault to manage secrets.
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
              <h1 className="kms-title">Secrets</h1>
              <p className="kms-subtitle mt-2">
                Values stay masked by default and reveal actions remain audit-aware.
              </p>
            </div>
            <Button className="rounded-xl" onClick={() => setShowCreateForm((v) => !v)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Secret
            </Button>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateSecret} className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="secret-name">Name</Label>
                <Input
                  id="secret-name"
                  value={newSecret.name}
                  onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
                  placeholder="DATABASE_PASSWORD"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret-key">Encryption key</Label>
                <select
                  id="secret-key"
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  value={newSecret.keyId}
                  onChange={(e) => setNewSecret({ ...newSecret, keyId: e.target.value })}
                  required
                >
                  <option value="">Select key</option>
                  {keys?.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.valueType})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="secret-description">Description</Label>
                <Input
                  id="secret-description"
                  value={newSecret.description}
                  onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })}
                  placeholder="Production database password"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="secret-value">Value</Label>
                <Input
                  id="secret-value"
                  type="password"
                  value={newSecret.value}
                  onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="secret-password">Protection Password (Optional)</Label>
                <Input
                  id="secret-password"
                  type="password"
                  value={newSecret.password}
                  onChange={(e) => setNewSecret({ ...newSecret, password: e.target.value })}
                  placeholder="Leave blank for no password"
                  minLength={8}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isCreating || !newSecret.name || !newSecret.value || !newSecret.keyId || (newSecret.password.length > 0 && newSecret.password.length < 8)}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewSecret({ name: "", description: "", value: "", keyId: "", password: "" });
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
            placeholder="Search secrets"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </section>

        <section className="space-y-3">
          {secretsLoading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSecrets && filteredSecrets.length > 0 ? (
            filteredSecrets.map((secret) => (
              <Card key={secret.id} className="kms-surface border-border/80">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600">
                        <Lock className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium tracking-tight">{secret.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-md text-[11px]">
                            v{secret.currentVersion?.versionNumber || 1}
                          </Badge>
                          {secret.key ? (
                            <Badge variant="outline" className="rounded-md text-[11px]">
                              <KeyRound className="mr-1 h-3 w-3" />
                              {secret.key.name}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{secret.description || "No description"}</p>

                        {activePrompt === secret.id ? (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-2 py-1.5">
                            <Input
                              type="password"
                              placeholder="Enter secret password..."
                              className="h-7 text-xs"
                              value={revealPassword}
                              onChange={(e) => setRevealPassword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  toggleSecretVisibility(secret.id, revealPassword);
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-7"
                              disabled={isRevealing === secret.id || !revealPassword}
                              onClick={() => toggleSecretVisibility(secret.id, revealPassword)}
                            >
                              {isRevealing === secret.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                setActivePrompt(null);
                                setRevealPassword("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-2 py-1.5">
                            <code className="min-w-0 flex-1 truncate text-xs">
                              {visibleSecrets.has(secret.id) ? revealedSecrets[secret.id] || "loading..." : "••••••••••••••••"}
                            </code>
                            <Button variant="ghost" size="icon" onClick={() => toggleSecretVisibility(secret.id)} disabled={isRevealing === secret.id}>
                              {isRevealing === secret.id ? <Loader2 className="h-4 w-4 animate-spin" /> : visibleSecrets.has(secret.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {visibleSecrets.has(secret.id) ? (
                              <Button variant="ghost" size="icon" onClick={() => copySecret(secret.id)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        )}

                        <p className="mt-2 text-xs text-muted-foreground">Updated {formatDateTime(secret.updatedAt)}</p>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete secret \"${secret.name}\"?`)) {
                          deleteSecret(secret.id);
                        }
                      }}
                      title="Delete secret"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 px-6 py-14 text-center text-muted-foreground">
              <Lock className="mx-auto mb-2 h-6 w-6" />
              {searchQuery ? "No secrets match your search." : "No secrets yet. Create your first secret."}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
