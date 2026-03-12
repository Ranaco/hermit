"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecrets, useCreateSecret, useDeleteSecret, useUpdateSecret, useSecretVersions } from "@/hooks/use-secrets";
import { useSecretGroups, useCreateSecretGroup, useDeleteSecretGroup } from "@/hooks/use-secret-groups";
import { secretService } from "@/services/secret.service";
import { secretGroupService } from "@/services/secret-group.service";
import { useKeys } from "@/hooks/use-keys";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, Search, Lock, Eye, EyeOff, Vault, KeyRound, Loader2, Copy, Folder, ChevronRight, FolderPlus, History, RefreshCcw, Shield, Link as LinkIcon } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
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

  const getSecretPreview = (key: string) => {
    if (!visibleSecrets.has(key)) {
      return "Hidden secret value";
    }

    return revealedSecrets[key] || "Loading secret value...";
  };

  const filteredSecrets = useMemo(
    () => secrets?.secrets?.filter((secret) => secret.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [secrets?.secrets, searchQuery],
  );

  const filteredGroups = useMemo(
    () => groups?.data?.filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [groups?.data, searchQuery],
  );

  const keyItems = useMemo(
    () =>
      keys?.map((key) => ({
        value: key.id,
        label: key.name,
        description: key.valueType,
        keywords: [key.valueType],
      })) || [],
    [keys],
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
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="cupertino-glass-panel !p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Secrets</h1>
              <p className="text-[15px] font-medium text-muted-foreground mt-2">
                Organize your credentials with folders or direct secrets.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button variant="secondary" className="rounded-2xl h-11 px-5 shadow-sm" onClick={() => setShowShareModal(true)}>
                <LinkIcon className="mr-2 h-4 w-4 text-indigo-500" />
                Share
              </Button>
              <Button variant="secondary" className="rounded-2xl h-11 px-5" onClick={() => {
                setShowCreateFolderForm((v) => !v);
                setShowCreateForm(false);
                setShowUpdateForm(false);
              }}>
                <FolderPlus className="mr-2 h-4 w-4 text-primary" />
                Create Folder
              </Button>
              <Button className="rounded-2xl h-11 px-6" onClick={() => {
                setShowCreateForm((v) => !v);
                setShowCreateFolderForm(false);
                setShowUpdateForm(false);
              }}>
                <Plus className="mr-2 h-5 w-5" />
                Create Secret
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              showUpdateForm && activeSecretId ? "opacity-100 mt-6 max-h-[1000px]" : "max-h-0 opacity-0 mt-0"
            )}
          >
            {showUpdateForm && activeSecretId ? (
              <form onSubmit={handleUpdateSecret} className="grid gap-4 rounded-[20px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold tracking-tight text-foreground">Rotate / Update Secret</h3>
                    <p className="text-[13px] font-medium text-muted-foreground mt-0.5">This will create a new version of the existing secret. Old versions will stay encrypted.</p>
                  </div>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="update-value-type" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">New Value Type</Label>
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
                        className={cn(
                          "px-4 py-2 text-[13px] font-bold tracking-wider uppercase rounded-xl border transition-all duration-300",
                          updateSecretData.valueType === type
                            ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/20 scale-105"
                            : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent text-muted-foreground"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="update-secret-value" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">New Value</Label>
                  {updateSecretData.valueType === "JSON" || updateSecretData.valueType === "MULTILINE" ? (
                    <div className="relative">
                      <Textarea
                        id="update-secret-value"
                        value={updateSecretData.value}
                        onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                        placeholder={updateSecretData.valueType === "JSON" ? '{\n  "key": "value"\n}' : "Enter multi-line secret..."}
                        className="min-h-[120px] font-mono text-[13px] rounded-xl bg-background border-black/5 dark:border-white/5 focus:ring-2 focus:ring-primary/40 transition-all outline-none resize-y shadow-inner p-4"
                        required
                      />
                      {updateSecretData.valueType === "JSON" && updateSecretData.value.length > 0 && (
                        <div className="absolute right-3 top-3">
                          {(() => {
                            try {
                              JSON.parse(updateSecretData.value);
                              return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider shadow-none border-none pointer-events-none">Valid JSON</Badge>;
                            } catch (e) {
                              return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold tracking-wider shadow-none border-none pointer-events-none">Invalid JSON</Badge>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  ) : updateSecretData.valueType === "BOOLEAN" ? (
                    <Select
                      value={updateSecretData.value}
                      onValueChange={(value) => setUpdateSecretData({ ...updateSecretData, value })}
                    >
                      <SelectTrigger id="update-secret-value">
                        <SelectValue placeholder="Select boolean value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : updateSecretData.valueType === "NUMBER" ? (
                    <Input
                      id="update-secret-value"
                      type="number"
                      value={updateSecretData.value}
                      onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                      placeholder="12345"
                      className="h-11 font-mono text-[14px] rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                      required
                    />
                  ) : (
                    <Input
                      id="update-secret-value"
                      type="password"
                      value={updateSecretData.value}
                      onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                      placeholder="••••••••"
                      className="h-11 font-mono text-[14px] rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                      required
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-secret-desc" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Updated Description</Label>
                  <Input
                    id="update-secret-desc"
                    value={updateSecretData.description}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, description: e.target.value })}
                    placeholder="Update description..."
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-secret-commit" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Commit Message</Label>
                  <Input
                    id="update-secret-commit"
                    value={updateSecretData.commitMessage}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, commitMessage: e.target.value })}
                    placeholder="e.g. Scheduled 90-day rotation"
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="update-secret-password" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">New Protection Password (Optional)</Label>
                  <Input
                    id="update-secret-password"
                    type="password"
                    value={updateSecretData.password}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, password: e.target.value })}
                    placeholder="Leave blank to keep current password state, or provide a new 8+ character string"
                    minLength={8}
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button type="submit" className="h-11 rounded-xl px-8" disabled={isUpdating || !updateSecretData.value || (updateSecretData.password && updateSecretData.password?.length < 8 ? true : false)}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Version
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl px-6"
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
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              showCreateFolderForm ? "opacity-100 mt-6 max-h-[500px]" : "max-h-0 opacity-0 mt-0"
            )}
          >
            {showCreateFolderForm ? (
              <form onSubmit={handleCreateFolder} className="grid gap-4 rounded-[20px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="folder-name" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Database Credentials"
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                    required
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button type="submit" className="h-11 rounded-xl px-8" disabled={isCreatingFolder || !newFolderName}>
                    {isCreatingFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Folder
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl px-6"
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
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              showCreateForm && !showUpdateForm ? "opacity-100 mt-6 max-h-[1000px]" : "max-h-0 opacity-0 mt-0"
            )}
          >
            {showCreateForm && !showUpdateForm ? (
              <form onSubmit={handleCreateSecret} className="grid gap-4 rounded-[20px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="secret-name" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Name</Label>
                  <Input
                    id="secret-name"
                    value={newSecret.name}
                    onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
                    placeholder="DATABASE_PASSWORD"
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret-key" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Encryption Key</Label>
                  <Combobox
                    items={keyItems}
                    value={newSecret.keyId}
                    placeholder="Select key..."
                    searchPlaceholder="Search keys..."
                    emptyText="No keys found."
                    onValueChange={(value) => setNewSecret({ ...newSecret, keyId: value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secret-type" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Secret Type</Label>
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
                        className={cn(
                          "px-4 py-2 text-[13px] font-bold tracking-wider uppercase rounded-xl border transition-all duration-300",
                          newSecret.valueType === type
                            ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/20 scale-105"
                            : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent text-muted-foreground"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secret-description" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Description</Label>
                  <Input
                    id="secret-description"
                    value={newSecret.description}
                    onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })}
                    placeholder="Production database password"
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secret-value" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Value</Label>
                  {newSecret.valueType === "JSON" || newSecret.valueType === "MULTILINE" ? (
                    <div className="relative">
                      <Textarea
                        id="secret-value"
                        value={newSecret.value}
                        onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                        placeholder={newSecret.valueType === "JSON" ? '{\n  "key": "value"\n}' : "Enter multi-line secret..."}
                        className="min-h-[120px] font-mono text-[13px] rounded-xl bg-background border-black/5 dark:border-white/5 focus:ring-2 focus:ring-primary/40 transition-all outline-none resize-y shadow-inner p-4"
                        required
                      />
                      {newSecret.valueType === "JSON" && newSecret.value.length > 0 && (
                        <div className="absolute right-3 top-3">
                          {(() => {
                            try {
                              JSON.parse(newSecret.value);
                              return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider shadow-none border-none pointer-events-none">Valid JSON</Badge>;
                            } catch (e) {
                              return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold tracking-wider shadow-none border-none pointer-events-none">Invalid JSON</Badge>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  ) : newSecret.valueType === "BOOLEAN" ? (
                    <Select
                      value={newSecret.value}
                      onValueChange={(value) => setNewSecret({ ...newSecret, value })}
                    >
                      <SelectTrigger id="secret-value">
                        <SelectValue placeholder="Select boolean value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : newSecret.valueType === "NUMBER" ? (
                    <Input
                      id="secret-value"
                      type="number"
                      value={newSecret.value}
                      onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                      placeholder="12345"
                      className="h-11 font-mono text-[14px] rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                      required
                    />
                  ) : (
                    <Input
                      id="secret-value"
                      type="password"
                      value={newSecret.value}
                      onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                      placeholder="••••••••"
                      className="h-11 font-mono text-[14px] rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                      required
                    />
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secret-password" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Protection Password (Optional)</Label>
                  <Input
                    id="secret-password"
                    type="password"
                    value={newSecret.password}
                    onChange={(e) => setNewSecret({ ...newSecret, password: e.target.value })}
                    placeholder="Leave blank for no password"
                    minLength={8}
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5 shadow-inner"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button type="submit" className="h-11 rounded-xl px-8" disabled={isCreating || !newSecret.name || !newSecret.value || !newSecret.keyId || (newSecret.password.length > 0 && newSecret.password.length < 8)}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Secret
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl px-6"
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
          </div>
        </section>

        <section className="relative group">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search secrets or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-[15px] font-medium placeholder:text-muted-foreground/70 transition-all focus:bg-background shadow-glass-sm focus:shadow-glass-md"
          />
        </section>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[14px] text-muted-foreground font-medium bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 shadow-inner rounded-2xl px-5 py-3 overflow-x-auto whitespace-nowrap mb-6 transition-all duration-300">
          <button 
            onClick={() => {
              setCurrentGroupId(undefined);
              setBreadcrumbs([]);
            }} 
            className="hover:text-foreground transition-colors flex items-center"
          >
            <Folder className="h-4 w-4 mr-2" />
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

        <section className="space-y-4">
          {secretsLoading || groupsLoading ? (
            <div className="flex h-40 items-center justify-center rounded-[32px] border border-dashed border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (filteredSecrets && filteredSecrets.length > 0) || (filteredGroups && filteredGroups.length > 0) ? (
            <>
              {filteredGroups?.map((group) => (
                <Card 
                  key={group.id} 
                  className="cupertino-glass-panel hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-all duration-300 group"
                >
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div 
                      className="flex min-w-0 flex-1 items-center gap-4"
                      onClick={() => {
                        setCurrentGroupId(group.id);
                        setBreadcrumbs([...breadcrumbs, { id: group.id, name: group.name }]);
                        setSearchQuery("");
                      }}
                    >
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <Folder className="h-5 w-5 fill-primary/20" />
                      </div>
                      <div>
                        <p className="font-bold tracking-tight text-[16px] text-foreground group-hover:underline">{group.name}</p>
                        <p className="text-[13px] font-medium text-muted-foreground mt-0.5">
                           {group._count?.children || 0} subfolders, {group._count?.secrets || 0} secrets
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 self-start overflow-hidden rounded-xl border border-black/5 bg-black/[0.02] shadow-inner dark:border-white/5 dark:bg-white/[0.02] sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
              <Card key={secret.id} className="cupertino-glass-panel hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-300">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400 shadow-inner">
                        <Lock className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="min-w-0 break-words font-bold tracking-tight text-[16px] text-foreground">{secret.name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-lg px-2 text-[11px] font-bold tracking-wider uppercase h-5 shadow-none border-none">
                              v{secret.currentVersion?.versionNumber || 1}
                            </Badge>
                            {secret.key ? (
                              <Badge variant="outline" className="rounded-lg px-2 text-[11px] font-bold tracking-wider uppercase h-5 bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5">
                                <KeyRound className="mr-1 h-3 w-3" />
                                {secret.key.name}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1.5 text-[14px] font-medium text-muted-foreground">{secret.description || "No description provided."}</p>

                        {activePrompt === secret.id ? (
                          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-black/5 bg-black/[0.02] p-2 shadow-inner dark:border-white/5 dark:bg-white/[0.02] sm:flex-row sm:items-center">
                            <Input
                              type="password"
                              placeholder="Enter secret password..."
                              className="h-9 flex-1 bg-background text-[13px] shadow-sm"
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
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-9 rounded-xl px-4"
                                disabled={isRevealing === secret.id || !revealPassword}
                                onClick={() => toggleSecretVisibility(secret.id, revealPassword)}
                              >
                                {isRevealing === secret.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-xl px-4 text-muted-foreground"
                                onClick={() => {
                                  setActivePrompt(null);
                                  setRevealPassword("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-black/5 bg-black/[0.02] p-2 shadow-inner dark:border-white/5 dark:bg-white/[0.02] sm:flex-row sm:items-start">
                            <code className="block max-h-48 min-h-10 w-full min-w-0 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-black/5 bg-background px-3 py-2 font-mono text-[13px] leading-6 shadow-glass-sm dark:border-white/5">
                              {getSecretPreview(secret.id)}
                            </code>
                            <div className="flex shrink-0 justify-end gap-1">
                               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5" onClick={() => toggleSecretVisibility(secret.id)} disabled={isRevealing === secret.id}>
                                {isRevealing === secret.id ? <Loader2 className="h-4 w-4 animate-spin" /> : visibleSecrets.has(secret.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {visibleSecrets.has(secret.id) ? (
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5" onClick={() => copySecret(secret.id)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        )}

                        <p className="mt-4 text-[12px] font-bold tracking-wider uppercase text-muted-foreground/60">Updated {formatDateTime(secret.updatedAt)}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 self-end overflow-hidden rounded-2xl border border-black/5 bg-black/[0.02] shadow-inner dark:border-white/5 dark:bg-white/[0.02] xl:self-start">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-none border-r border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
                        <RefreshCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-none border-r border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
                        className="h-11 w-11 rounded-none hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
            <div className="rounded-[32px] border border-dashed border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] px-6 py-20 text-center flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-[16px] font-bold text-foreground">Nothing yet.</p>
              <p className="text-[14px] font-medium text-muted-foreground mt-1 max-w-sm">
                {searchQuery ? "No secrets or folders match your search." : "Create a folder or a secret to get started."}
              </p>
            </div>
          )}
        </section>

        {/* Versions Modal */}
        <Dialog open={showVersionsModal} onOpenChange={(open: boolean) => {
           setShowVersionsModal(open);
          if (!open) setActiveSecretId(null);
        }}>
          <DialogContent className="cupertino-glass-panel border-none bg-background/80 p-0 backdrop-blur-2xl sm:max-w-2xl">
            <DialogHeader className="border-b border-black/5 px-5 pb-4 pt-6 dark:border-white/5 sm:px-8 sm:pt-8">
              <DialogTitle className="text-2xl font-bold tracking-tight">Version History</DialogTitle>
            </DialogHeader>
            <div className="max-h-[min(70vh,44rem)] space-y-4 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
              {versionsLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : secretVersionsData?.versions?.length ? (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-black/10 dark:before:via-white/10 before:to-transparent">
                  {secretVersionsData.versions.map((version) => {
                    const vKey = `${activeSecretId}-v${version.versionNumber}`;
                    return (
                      <div key={version.id} className="group is-active relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground group-[.is-active]:bg-primary group-[.is-active]:text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors z-10">
                          <History className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 w-[calc(100%-4rem)] rounded-2xl border border-black/5 bg-background/50 p-4 shadow-sm backdrop-blur-md dark:border-white/5 md:w-[calc(50%-2.5rem)] sm:p-5">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="px-2 py-0.5 rounded-lg text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border-transparent">
                                 v{version.versionNumber}
                               </Badge>
                              <span className="text-[12px] font-bold text-muted-foreground">
                                {formatDateTime(version.createdAt)}
                              </span>
                            </div>
                          </div>

                           <div className="text-[13px] font-medium text-foreground mb-4">
                            {version.commitMessage ? (
                               <div className="border-l-2 border-primary/40 pl-3 py-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-r-lg">
                                 {version.commitMessage}
                               </div>
                             ) : "No commit message provided."}
                           </div>

                          {activePrompt === vKey ? (
                            <div className="flex flex-col gap-2 rounded-xl border border-black/5 bg-black/[0.02] p-2 shadow-inner dark:border-white/5 dark:bg-white/[0.02] sm:flex-row sm:items-center">
                              <Input
                                type="password"
                                placeholder="Password..."
                                className="h-8 bg-background text-[12px] sm:w-32"
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
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 rounded-lg px-3"
                                  disabled={isRevealing === vKey || !revealPassword}
                                  onClick={() => activeSecretId && toggleVersionVisibility(activeSecretId, version.versionNumber, revealPassword)}
                                >
                                  {isRevealing === vKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-lg px-2"
                                  onClick={() => {
                                    setActivePrompt(null);
                                    setRevealPassword("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                           ) : (
                            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-black/5 bg-black/[0.02] p-1.5 shadow-inner dark:border-white/5 dark:bg-white/[0.02] sm:flex-row sm:items-start">
                              <code className="block max-h-40 min-h-8 w-full min-w-0 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-black/5 bg-background px-2 py-1 font-mono text-[13px] leading-5 dark:border-white/5">
                                 {getSecretPreview(vKey)}
                              </code>
                              <div className="flex shrink-0 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => activeSecretId && toggleVersionVisibility(activeSecretId, version.versionNumber)} 
                                  disabled={isRevealing === vKey}
                                  className="h-8 w-8 rounded-lg"
                                >
                                  {isRevealing === vKey ? <Loader2 className="h-3 w-3 animate-spin" /> : visibleSecrets.has(vKey) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                {visibleSecrets.has(vKey) ? (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => activeSecretId && copySecret(activeSecretId, version.versionNumber)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          )}
                          <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground/60 mt-4 flex items-center gap-1">
                            By {version.createdBy?.firstName || version.createdBy?.email}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
                   <p className="text-[14px] font-bold text-muted-foreground">No version history found.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        <CreateShareModal isOpen={showShareModal} onOpenChange={setShowShareModal} />
      </div>
    </DashboardLayout>
  );
}
