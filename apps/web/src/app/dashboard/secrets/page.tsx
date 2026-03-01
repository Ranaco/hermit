"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSecrets, useCreateSecret, useDeleteSecret, useUpdateSecret, useSecretVersions } from "@/hooks/use-secrets";
import { useSecretGroups, useCreateSecretGroup, useDeleteSecretGroup } from "@/hooks/use-secret-groups";
import { secretService } from "@/services/secret.service";
import { secretGroupService } from "@/services/secret-group.service";
import { useKeys } from "@/hooks/use-keys";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, Search, Lock, Eye, EyeOff, Vault, KeyRound, Loader2, Copy, Folder, ChevronRight, FolderPlus, History, RefreshCcw, Shield, Link as LinkIcon } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { CreateShareModal } from "@/components/shares/create-share-modal";


export default function SecretsPage() {
  const { currentVault } = useOrganizationStore();

  const [currentGroupId, setCurrentGroupId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [showCreateFolderForm, setShowCreateFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState("");
  const [isRevealing, setIsRevealing] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<{
    name: string;
    description: string;
    value: string;
    valueType: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
    keyId: string;
    password: string;
  }>({
    name: "",
    description: "",
    value: "",
    valueType: "STRING",
    keyId: "",
    password: "",
  });

  const [showShareModal, setShowShareModal] = useState(false);



  const [activeSecretId, setActiveSecretId] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [updateSecretData, setUpdateSecretData] = useState<{
    value: string;
    description: string;
    commitMessage: string;
    valueType: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
    password?: string;
  }>({
    value: "",
    description: "",
    commitMessage: "",
    valueType: "STRING",
    password: "",
  });

  const { data: groups, isLoading: groupsLoading } = useSecretGroups(currentVault?.id, currentGroupId);
  const { data: secrets, isLoading: secretsLoading } = useSecrets(currentVault?.id, currentGroupId);
  const { data: keys } = useKeys(currentVault?.id);
  const { mutate: createSecret, isPending: isCreating } = useCreateSecret();
  const { mutate: updateSecret, isPending: isUpdating } = useUpdateSecret();
  const { mutate: deleteSecret } = useDeleteSecret();
  const { mutate: createFolder, isPending: isCreatingFolder } = useCreateSecretGroup();
  const { mutate: deleteFolder } = useDeleteSecretGroup();

  const { data: secretVersionsData, isLoading: versionsLoading } = useSecretVersions(
    showVersionsModal && activeSecretId ? activeSecretId : ""
  );

  const filteredSecrets = useMemo(
    () => secrets?.secrets?.filter((secret) => secret.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [secrets?.secrets, searchQuery],
  );

  const filteredGroups = useMemo(
    () => groups?.data?.filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [groups?.data, searchQuery],
  );

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVault || !newFolderName) return;

    createFolder(
      {
        vaultId: currentVault.id,
        data: { name: newFolderName, vaultId: currentVault.id, parentId: currentGroupId },
      },
      {
        onSuccess: () => {
          setShowCreateFolderForm(false);
          setNewFolderName("");
        },
      }
    );
  };


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

  const toggleVersionVisibility = async (secretId: string, versionNumber: number, providedPassword?: string) => {
    const key = `${secretId}-v${versionNumber}`;
    const nextVisible = new Set(visibleSecrets);

    if (nextVisible.has(key) && !providedPassword) {
      nextVisible.delete(key);
      setVisibleSecrets(nextVisible);
      setRevealedSecrets((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      setActivePrompt(null);
      setRevealPassword("");
      return;
    }

    setIsRevealing(key);
    try {
      const response = await secretService.reveal(secretId, { 
        password: providedPassword,
        versionNumber
      });
      
      if (response.requiresPassword) {
        setActivePrompt(key);
        if (providedPassword) {
          toast.error("Incorrect password");
          setRevealPassword("");
        }
      } else if (response.secret?.value) {
        nextVisible.add(key);
        setVisibleSecrets(nextVisible);
        setRevealedSecrets((prev) => ({ ...prev, [key]: response.secret?.value || "" }));
        setActivePrompt(null);
        setRevealPassword("");
      } else {
        toast.error("Unable to reveal secret version value");
      }
    } catch (error) {
      toast.error("Failed to reveal secret version");
    } finally {
      setIsRevealing(null);
    }
  };

  const copySecret = async (secretId: string, versionNumber?: number) => {
    const key = versionNumber ? `${secretId}-v${versionNumber}` : secretId;
    const value = revealedSecrets[key];
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
        secretGroupId: currentGroupId,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewSecret({ name: "", description: "", value: "", valueType: "STRING", keyId: "", password: "" });
        },
      },
    );
  };

  const handleUpdateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSecretId) return;

    updateSecret(
      {
        id: activeSecretId,
        data: {
          ...updateSecretData,
          password: updateSecretData.password || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowUpdateForm(false);
          setActiveSecretId(null);
          setUpdateSecretData({ value: "", description: "", commitMessage: "", valueType: "STRING", password: "" });
        },
      }
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
                Organize your credentials with folders or direct secrets.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="rounded-xl border border-border/80 bg-background/50 hover:bg-background shadow-sm" onClick={() => setShowShareModal(true)}>
                <LinkIcon className="mr-2 h-4 w-4 text-indigo-500" />
                Share
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => {
                setShowCreateFolderForm((v) => !v);
                setShowCreateForm(false);
                setShowUpdateForm(false);
              }}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
              <Button className="rounded-xl" onClick={() => {
                setShowCreateForm((v) => !v);
                setShowCreateFolderForm(false);
                setShowUpdateForm(false);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Secret
              </Button>
            </div>
          </div>

          {showUpdateForm && activeSecretId ? (
            <form onSubmit={handleUpdateSecret} className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Rotate / Update Secret</h3>
                  <p className="text-xs text-muted-foreground">This will create a new version of the existing secret. Old versions will stay encrypted.</p>
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="update-value-type">New Value Type</Label>
                <div className="flex flex-wrap gap-2">
                  {['STRING', 'JSON', 'NUMBER', 'BOOLEAN', 'MULTILINE'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        let defaultVal = "";
                        if (type === "BOOLEAN") defaultVal = "true";
                        if (type === "NUMBER") defaultVal = "0";
                        if (type === "JSON") defaultVal = "{}";
                        setUpdateSecretData({ ...updateSecretData, valueType: type as any, value: defaultVal });
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        updateSecretData.valueType === type
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background/50 hover:bg-background border-border text-muted-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="update-secret-value">New Value</Label>
                {updateSecretData.valueType === "JSON" || updateSecretData.valueType === "MULTILINE" ? (
                  <div className="relative">
                    <Textarea
                      id="update-secret-value"
                      value={updateSecretData.value}
                      onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                      placeholder={updateSecretData.valueType === "JSON" ? '{\n  "key": "value"\n}' : "Enter multi-line secret..."}
                      className="min-h-[120px] font-mono text-xs rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y"
                      required
                    />
                    {updateSecretData.valueType === "JSON" && updateSecretData.value.length > 0 && (
                      <div className="absolute right-3 top-3">
                        {(() => {
                          try {
                            JSON.parse(updateSecretData.value);
                            return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none pointer-events-none">Valid JSON</Badge>;
                          } catch (e) {
                            return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-none border-none pointer-events-none">Invalid JSON</Badge>;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ) : updateSecretData.valueType === "BOOLEAN" ? (
                  <select
                    id="update-secret-value"
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    value={updateSecretData.value}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                    required
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : updateSecretData.valueType === "NUMBER" ? (
                  <Input
                    id="update-secret-value"
                    type="number"
                    value={updateSecretData.value}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                    placeholder="12345"
                    className="font-mono focus:ring-primary/20 transition-all rounded-xl"
                    required
                  />
                ) : (
                  <Input
                    id="update-secret-value"
                    type="password"
                    value={updateSecretData.value}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                    placeholder="••••••••"
                    className="font-mono focus:ring-primary/20 transition-all rounded-xl"
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-secret-desc">Updated Description (Optional)</Label>
                <Input
                  id="update-secret-desc"
                  value={updateSecretData.description}
                  onChange={(e) => setUpdateSecretData({ ...updateSecretData, description: e.target.value })}
                  placeholder="Update description..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-secret-commit">Commit Message / Reason (Optional)</Label>
                <Input
                  id="update-secret-commit"
                  value={updateSecretData.commitMessage}
                  onChange={(e) => setUpdateSecretData({ ...updateSecretData, commitMessage: e.target.value })}
                  placeholder="e.g. Scheduled 90-day rotation"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="update-secret-password">New Protection Password (Optional)</Label>
                <Input
                  id="update-secret-password"
                  type="password"
                  value={updateSecretData.password}
                  onChange={(e) => setUpdateSecretData({ ...updateSecretData, password: e.target.value })}
                  placeholder="Leave blank to keep current password state, or provide a new 8+ character string"
                  minLength={8}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isUpdating || !updateSecretData.value || (updateSecretData.password && updateSecretData.password?.length < 8 ? true : false)}>
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Version
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUpdateForm(false);
                    setActiveSecretId(null);
                    setUpdateSecretData({ value: "", description: "", commitMessage: "", valueType: "STRING", password: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {showCreateFolderForm ? (
            <form onSubmit={handleCreateFolder} className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Database Credentials"
                  required
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isCreatingFolder || !newFolderName}>
                  {isCreatingFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Folder
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateFolderForm(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {showCreateForm && !showUpdateForm ? (
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
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={newSecret.keyId}
                  onChange={(e) => setNewSecret({ ...newSecret, keyId: e.target.value })}
                  required
                >
                  <option value="" disabled>Select key</option>
                  {keys?.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.valueType})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="secret-type">Secret Type</Label>
                <div className="flex flex-wrap gap-2">
                  {['STRING', 'JSON', 'NUMBER', 'BOOLEAN', 'MULTILINE'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        let defaultVal = "";
                        if (type === "BOOLEAN") defaultVal = "true";
                        if (type === "NUMBER") defaultVal = "0";
                        if (type === "JSON") defaultVal = "{}";
                        setNewSecret({ ...newSecret, valueType: type as any, value: defaultVal });
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        newSecret.valueType === type
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background/50 hover:bg-background border-border text-muted-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
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
                {newSecret.valueType === "JSON" || newSecret.valueType === "MULTILINE" ? (
                  <div className="relative">
                    <Textarea
                      id="secret-value"
                      value={newSecret.value}
                      onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                      placeholder={newSecret.valueType === "JSON" ? '{\n  "key": "value"\n}' : "Enter multi-line secret..."}
                      className="min-h-[120px] font-mono text-xs rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y"
                      required
                    />
                    {newSecret.valueType === "JSON" && newSecret.value.length > 0 && (
                      <div className="absolute right-3 top-3">
                        {(() => {
                          try {
                            JSON.parse(newSecret.value);
                            return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none pointer-events-none">Valid JSON</Badge>;
                          } catch (e) {
                            return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-none border-none pointer-events-none">Invalid JSON</Badge>;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ) : newSecret.valueType === "BOOLEAN" ? (
                  <select
                    id="secret-value"
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    value={newSecret.value}
                    onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                    required
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : newSecret.valueType === "NUMBER" ? (
                  <Input
                    id="secret-value"
                    type="number"
                    value={newSecret.value}
                    onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                    placeholder="12345"
                    className="font-mono focus:ring-primary/20 transition-all rounded-xl"
                    required
                  />
                ) : (
                  <Input
                    id="secret-value"
                    type="password"
                    value={newSecret.value}
                    onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                    placeholder="••••••••"
                    className="font-mono focus:ring-primary/20 transition-all rounded-xl"
                    required
                  />
                )}
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
                    setNewSecret({ name: "", description: "", value: "", valueType: "STRING", keyId: "", password: "" });
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

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium bg-background/50 border border-border/60 rounded-xl px-4 py-2 overflow-x-auto whitespace-nowrap">
          <button 
            onClick={() => {
              setCurrentGroupId(undefined);
              setBreadcrumbs([]);
            }} 
            className="hover:text-foreground transition-colors flex items-center"
          >
            <Folder className="h-4 w-4 mr-1.5" />
            Root
          </button>
          
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.id} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 opacity-50" />
              <button
                onClick={() => {
                  setCurrentGroupId(crumb.id);
                  setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
                }}
                className="hover:text-foreground transition-colors"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          {secretsLoading || groupsLoading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (filteredSecrets && filteredSecrets.length > 0) || (filteredGroups && filteredGroups.length > 0) ? (
            <>
              {filteredGroups?.map((group) => (
                <Card 
                  key={group.id} 
                  className="kms-surface border-border/80 cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div 
                      className="flex min-w-0 flex-1 items-center gap-3"
                      onClick={() => {
                        setCurrentGroupId(group.id);
                        setBreadcrumbs([...breadcrumbs, { id: group.id, name: group.name }]);
                        setSearchQuery("");
                      }}
                    >
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Folder className="h-4 w-4 fill-primary/20" />
                      </div>
                      <div>
                        <p className="font-medium tracking-tight hover:underline">{group.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group._count?.children || 0} subfolders, {group._count?.secrets || 0} secrets
                        </p>
                      </div>
                    </div>
                    <div className="flex bg-background/50 border border-border/50 rounded-lg overflow-hidden shrink-0">

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete folder "${group.name}"? It must be empty first.`)) {
                            deleteFolder({ vaultId: currentVault.id, groupId: group.id });
                          }
                        }}
                        title="Delete folder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredSecrets?.map((secret) => (
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

                    <div className="flex bg-background/50 border border-border/50 rounded-lg overflow-hidden shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-r border-border/50 hover:bg-muted/50"
                        onClick={() => {
                          if (activeSecretId === secret.id && showUpdateForm) {
                            setShowUpdateForm(false);
                            setActiveSecretId(null);
                          } else {
                            setActiveSecretId(secret.id);
                            setShowUpdateForm(true);
                            setShowCreateForm(false);
                            setShowCreateFolderForm(false);
                            setUpdateSecretData(prev => ({ ...prev, description: secret.description || "", valueType: secret.valueType }));
                          }
                        }}
                        title="Rotate / Update Secret"
                      >
                        <RefreshCcw className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-r border-border/50 hover:bg-muted/50"
                        onClick={() => {
                          setActiveSecretId(secret.id);
                          setShowVersionsModal(true);
                        }}
                        title="Version History"
                      >
                        <History className="h-4 w-4 text-indigo-500" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete secret "${secret.name}"?`)) {
                            deleteSecret(secret.id);
                          }
                        }}
                        title="Delete secret"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 px-6 py-14 text-center text-muted-foreground">
              <Lock className="mx-auto mb-2 h-6 w-6 opacity-50" />
              {searchQuery ? "No secrets or folders match your search." : "Empty here. Create a secret or a new folder."}
            </div>
          )}
        </section>

        {/* Versions Modal */}
        <Dialog open={showVersionsModal} onOpenChange={(open: boolean) => {
          setShowVersionsModal(open);
          if (!open) setActiveSecretId(null);
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4">
              {versionsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : secretVersionsData?.versions?.length ? (
                <div className="space-y-3">
                  {secretVersionsData.versions.map((version) => {
                    const vKey = `${activeSecretId}-v${version.versionNumber}`;
                    return (
                      <div key={version.id} className="border border-border/60 rounded-xl p-4 bg-muted/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-2">v{version.versionNumber}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(version.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            by {version.createdBy?.firstName || version.createdBy?.email}
                          </div>
                        </div>

                        {version.commitMessage && (
                          <div className="text-sm border-l-2 border-primary/40 pl-3 py-1 bg-background/40">
                            {version.commitMessage}
                          </div>
                        )}

                        {activePrompt === vKey ? (
                          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/90 px-2 py-1.5 w-max">
                            <Input
                              type="password"
                              placeholder="Enter secret password..."
                              className="h-7 text-xs w-48"
                              value={revealPassword}
                              onChange={(e) => setRevealPassword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && activeSecretId) {
                                  e.preventDefault();
                                  toggleVersionVisibility(activeSecretId, version.versionNumber, revealPassword);
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-7"
                              disabled={isRevealing === vKey || !revealPassword}
                              onClick={() => activeSecretId && toggleVersionVisibility(activeSecretId, version.versionNumber, revealPassword)}
                            >
                              {isRevealing === vKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
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
                          <div className="flex items-center gap-2 bg-background/60 border border-border/40 rounded-lg px-3 py-2">
                            <code className="min-w-0 flex-1 text-xs break-all">
                              {visibleSecrets.has(vKey) ? revealedSecrets[vKey] || "loading..." : "••••••••••••••••"}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => activeSecretId && toggleVersionVisibility(activeSecretId, version.versionNumber)} 
                              disabled={isRevealing === vKey}
                              className="h-7 w-7"
                            >
                              {isRevealing === vKey ? <Loader2 className="h-3 w-3 animate-spin" /> : visibleSecrets.has(vKey) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            {visibleSecrets.has(vKey) ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => activeSecretId && copySecret(activeSecretId, version.versionNumber)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-8">No version history found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        <CreateShareModal isOpen={showShareModal} onOpenChange={setShowShareModal} />
      </div>
    </DashboardLayout>
  );
}
