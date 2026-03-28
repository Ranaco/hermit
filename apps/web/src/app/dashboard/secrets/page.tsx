"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecrets, useCreateSecret, useDeleteSecret, useUpdateSecret, useSecretVersions } from "@/hooks/use-secrets";
import { useGroups, useCreateGroup, useDeleteGroup } from "@/hooks/use-groups";
import { secretService } from "@/services/secret.service";
import { useKeys } from "@/hooks/use-keys";
import { useRBAC } from "@/hooks/use-rbac";
import { useOrganizationStore } from "@/store/organization.store";
import { Plus, Trash2, Search, Lock, Eye, EyeOff, Vault, KeyRound, Loader2, Copy, Folder, ChevronRight, FolderPlus, History, RefreshCcw, Link as LinkIcon } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreateShareModal } from "@/components/shares/create-share-modal";

type SecretValueType = "STRING" | "JSON" | "NUMBER" | "BOOLEAN" | "MULTILINE";

const SECRET_VALUE_TYPES: SecretValueType[] = [
  "STRING",
  "JSON",
  "NUMBER",
  "BOOLEAN",
  "MULTILINE",
];

const getDefaultSecretValue = (type: SecretValueType) => {
  if (type === "BOOLEAN") return "true";
  if (type === "NUMBER") return "0";
  if (type === "JSON") return "{}";
  return "";
};

const MASKED_SECRET_PREVIEW = "********";


export default function SecretsPage() {
  const { currentVault } = useOrganizationStore();
  const permissions = useRBAC();

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
    valueType: SecretValueType;
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
    valueType: SecretValueType;
    password?: string;
  }>({
    value: "",
    description: "",
    commitMessage: "",
    valueType: "STRING",
    password: "",
  });

  const { data: groups, isLoading: groupsLoading } = useGroups(currentVault?.id, currentGroupId);
  const { data: secrets, isLoading: secretsLoading } = useSecrets(currentVault?.id, currentGroupId);
  const { data: keys } = useKeys(currentVault?.id);
  const { mutate: createSecret, isPending: isCreating } = useCreateSecret();
  const { mutate: updateSecret, isPending: isUpdating } = useUpdateSecret();
  const { mutate: deleteSecret } = useDeleteSecret();
  const { mutate: createFolder, isPending: isCreatingFolder } = useCreateGroup();
  const { mutate: deleteFolder } = useDeleteGroup();

  const { data: secretVersionsData, isLoading: versionsLoading } = useSecretVersions(
    showVersionsModal && activeSecretId ? activeSecretId : ""
  );

  const getSecretPreview = (key: string) => {
    if (!visibleSecrets.has(key)) {
      return MASKED_SECRET_PREVIEW;
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
    } catch {
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
    } catch {
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
        groupId: currentGroupId,
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
        <div className="app-empty hermit-enter">
          <Vault className="mx-auto mb-3 h-8 w-8" />
          Select a vault to manage secrets.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="hermit-page-hero app-page-header border-b-0 pb-6">
          <div className="app-page-intro relative z-10">
            <p className="app-eyebrow">Secrets</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Secret custody
            </h1>
            <p className="app-page-copy">Credentials, folders, reveal controls, and versioned values.</p>
          </div>
          <div className="app-toolbar relative z-10">
            <Button variant="secondary" className="h-11 px-5" onClick={() => setShowShareModal(true)}>
              <LinkIcon className="mr-2 h-4 w-4 text-indigo-500" />
              Share
            </Button>
            {permissions.canCreateSecret ? (
              <>
                <Button
                  variant="secondary"
                  className="h-11 px-5"
                  onClick={() => {
                    setShowCreateFolderForm(true);
                    setShowCreateForm(false);
                    setShowUpdateForm(false);
                  }}
                >
                  <FolderPlus className="mr-2 h-4 w-4 text-primary" />
                  Create Folder
                </Button>
                <Button
                  className="h-11 px-6"
                  onClick={() => {
                    setShowCreateForm(true);
                    setShowCreateFolderForm(false);
                    setShowUpdateForm(false);
                  }}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Secret
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <Dialog
          open={showCreateFolderForm}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateFolderForm(false);
              setNewFolderName("");
            }
          }}
        >
          <DialogContent className="max-w-xl p-0">
            <DialogHeader className="border-b border-border/80 px-6 py-5 sm:px-7">
              <DialogTitle>Create folder</DialogTitle>
              <DialogDescription>
                Organize related secrets without leaving the current vault path.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateFolder} className="app-dialog-body grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name">Folder name</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Database credentials"
                  required
                />
              </div>
              <DialogFooter className="app-dialog-footer">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateFolderForm(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingFolder || !newFolderName}>
                  {isCreatingFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create folder
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showCreateForm}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateForm(false);
              setNewSecret({ name: "", description: "", value: "", valueType: "STRING", keyId: "", password: "" });
            }
          }}
        >
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="border-b border-border/80 px-6 py-5 sm:px-7">
              <DialogTitle>Create secret</DialogTitle>
              <DialogDescription>
                Add a versioned value and bind it to an encryption key in this vault.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSecret} className="app-dialog-body grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="secret-type">Secret type</Label>
                <div className="flex flex-wrap gap-2">
                  {SECRET_VALUE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNewSecret({
                          ...newSecret,
                          valueType: type,
                          value: getDefaultSecretValue(type),
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-[13px] font-bold tracking-wider uppercase transition-all duration-300",
                        newSecret.valueType === type
                          ? "scale-105 border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "border-transparent bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
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
                      placeholder={newSecret.valueType === "JSON" ? "{\n  \"key\": \"value\"\n}" : "Enter multi-line secret..."}
                      className="min-h-[140px] resize-y font-mono text-[13px]"
                      required
                    />
                    {newSecret.valueType === "JSON" && newSecret.value.length > 0 ? (
                      <div className="absolute right-3 top-3">
                        {(() => {
                          try {
                            JSON.parse(newSecret.value);
                            return <Badge className="pointer-events-none border-none bg-emerald-500/10 font-bold tracking-wider text-emerald-600 shadow-none dark:text-emerald-400">Valid JSON</Badge>;
                          } catch {
                            return <Badge className="pointer-events-none border-none bg-rose-500/10 font-bold tracking-wider text-rose-600 shadow-none dark:text-rose-400">Invalid JSON</Badge>;
                          }
                        })()}
                      </div>
                    ) : null}
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
                    className="font-mono"
                    required
                  />
                ) : (
                  <Input
                    id="secret-value"
                    type="password"
                    value={newSecret.value}
                    onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                    placeholder={MASKED_SECRET_PREVIEW}
                    className="font-mono"
                    autoComplete="new-password"
                    required
                  />
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="secret-password">Protection password</Label>
                <Input
                  id="secret-password"
                  type="password"
                  value={newSecret.password}
                  onChange={(e) => setNewSecret({ ...newSecret, password: e.target.value })}
                  placeholder="Optional, 8+ characters"
                  minLength={8}
                  autoComplete="new-password"
                />
                {newSecret.password.length > 0 && newSecret.password.length < 8 ? (
                  <p className="text-xs text-destructive">Protection password must be at least 8 characters.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Add a second reveal challenge for this secret only.</p>
                )}
              </div>
              <DialogFooter className="app-dialog-footer md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewSecret({ name: "", description: "", value: "", valueType: "STRING", keyId: "", password: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isCreating ||
                    !newSecret.name ||
                    !newSecret.value ||
                    !newSecret.keyId ||
                    (newSecret.password.length > 0 && newSecret.password.length < 8)
                  }
                >
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create secret
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={permissions.canEditSecret && showUpdateForm && !!activeSecretId}
          onOpenChange={(open) => {
            if (!open) {
              setShowUpdateForm(false);
              setActiveSecretId(null);
              setUpdateSecretData({ value: "", description: "", commitMessage: "", valueType: "STRING", password: "" });
            }
          }}
        >
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="border-b border-border/80 px-6 py-5 sm:px-7">
              <DialogTitle>Rotate secret</DialogTitle>
              <DialogDescription>
                Create a fresh version and optionally update the description or protection password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSecret} className="app-dialog-body grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="update-value-type">New value type</Label>
                <div className="flex flex-wrap gap-2">
                  {SECRET_VALUE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setUpdateSecretData({
                          ...updateSecretData,
                          valueType: type,
                          value: getDefaultSecretValue(type),
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-[13px] font-bold tracking-wider uppercase transition-all duration-300",
                        updateSecretData.valueType === type
                          ? "scale-105 border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "border-transparent bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="update-secret-value">New value</Label>
                {updateSecretData.valueType === "JSON" || updateSecretData.valueType === "MULTILINE" ? (
                  <div className="relative">
                    <Textarea
                      id="update-secret-value"
                      value={updateSecretData.value}
                      onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                      placeholder={updateSecretData.valueType === "JSON" ? "{\n  \"key\": \"value\"\n}" : "Enter multi-line secret..."}
                      className="min-h-[140px] resize-y font-mono text-[13px]"
                      required
                    />
                    {updateSecretData.valueType === "JSON" && updateSecretData.value.length > 0 ? (
                      <div className="absolute right-3 top-3">
                        {(() => {
                          try {
                            JSON.parse(updateSecretData.value);
                            return <Badge className="pointer-events-none border-none bg-emerald-500/10 font-bold tracking-wider text-emerald-600 shadow-none dark:text-emerald-400">Valid JSON</Badge>;
                          } catch {
                            return <Badge className="pointer-events-none border-none bg-rose-500/10 font-bold tracking-wider text-rose-600 shadow-none dark:text-rose-400">Invalid JSON</Badge>;
                          }
                        })()}
                      </div>
                    ) : null}
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
                    className="font-mono"
                    required
                  />
                ) : (
                  <Input
                    id="update-secret-value"
                    type="password"
                    value={updateSecretData.value}
                    onChange={(e) => setUpdateSecretData({ ...updateSecretData, value: e.target.value })}
                    placeholder={MASKED_SECRET_PREVIEW}
                    className="font-mono"
                    autoComplete="new-password"
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-secret-desc">Updated description</Label>
                <Input
                  id="update-secret-desc"
                  value={updateSecretData.description}
                  onChange={(e) => setUpdateSecretData({ ...updateSecretData, description: e.target.value })}
                  placeholder="Update description..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-secret-commit">Commit message</Label>
                <Input
                  id="update-secret-commit"
                  value={updateSecretData.commitMessage}
                  onChange={(e) => setUpdateSecretData({ ...updateSecretData, commitMessage: e.target.value })}
                  placeholder="Scheduled 90-day rotation"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="update-secret-password">New protection password</Label>
                <Input
                  id="update-secret-password"
                  type="password"
                  value={updateSecretData.password}
                  onChange={(e) => setUpdateSecretData({ ...updateSecretData, password: e.target.value })}
                  placeholder="Leave blank to keep current protection state"
                  minLength={8}
                  autoComplete="new-password"
                />
                {updateSecretData.password && updateSecretData.password.length < 8 ? (
                  <p className="text-xs text-destructive">Protection password must be at least 8 characters.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Leave blank to preserve the current password requirements.</p>
                )}
              </div>
              <DialogFooter className="app-dialog-footer md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowUpdateForm(false);
                    setActiveSecretId(null);
                    setUpdateSecretData({ value: "", description: "", commitMessage: "", valueType: "STRING", password: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isUpdating ||
                    !updateSecretData.value ||
                    (!!updateSecretData.password && updateSecretData.password.length < 8)
                  }
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save version
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <section className="hermit-enter-soft relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search secrets or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </section>

        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-border/70 pb-3 text-[14px] font-medium text-muted-foreground hermit-enter-soft">
          <button
            onClick={() => {
              setCurrentGroupId(undefined);
              setBreadcrumbs([]);
            }}
            className="hermit-compact-chip hover:text-foreground transition-colors flex items-center"
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
                className="hermit-compact-chip hover:text-foreground transition-colors"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          {secretsLoading || groupsLoading ? (
            <div className="app-empty hermit-enter-soft">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (filteredSecrets && filteredSecrets.length > 0) || (filteredGroups && filteredGroups.length > 0) ? (
            <>
              {filteredGroups?.map((group) => (
                <Card
                  key={group.id}
                  className="hermit-list-row cursor-pointer transition-colors group"
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
                      <div className="rounded-2xl border border-border/80 bg-muted/55 p-3 text-muted-foreground">
                        <Folder className="h-5 w-5 fill-primary/20" />
                      </div>
                      <div>
                        <p className="font-bold tracking-tight text-[16px] text-foreground group-hover:underline">{group.name}</p>
                        <p className="text-[13px] font-medium text-muted-foreground mt-0.5">
                          {group._count?.children || 0} subfolders, {group._count?.secrets || 0} secrets
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 self-start overflow-hidden rounded-2xl border border-border bg-background/82 sm:self-center">
                      {permissions.canDeleteSecret ? (
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
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredSecrets?.map((secret) => (
                <Card key={secret.id} className="hermit-list-row">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="rounded-2xl border border-border/80 bg-muted/55 p-3 text-muted-foreground">
                          <Lock className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="min-w-0 break-words font-semibold tracking-tight text-[16px] text-foreground">{secret.name}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="h-5 px-2 text-[11px] uppercase">
                                v{secret.currentVersion?.versionNumber || 1}
                              </Badge>
                              {secret.key ? (
                                <Badge variant="outline" className="h-5 px-2 text-[11px] uppercase">
                                  <KeyRound className="mr-1 h-3 w-3" />
                                  {secret.key.name}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-1.5 text-[14px] font-medium text-muted-foreground">{secret.description || "No description provided."}</p>

                          {activePrompt === secret.id ? (
                            <div className="mt-4 flex flex-col gap-3 rounded-[18px] border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
                              <Input
                                type="password"
                                placeholder="Enter secret password..."
                                className="h-9 flex-1 bg-background text-[13px] shadow-sm"
                                autoComplete="current-password"
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
                                  className="h-9 px-4"
                                  disabled={isRevealing === secret.id || !revealPassword}
                                  onClick={() => toggleSecretVisibility(secret.id, revealPassword)}
                                >
                                  {isRevealing === secret.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 px-4 text-muted-foreground"
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
                            <div className="mt-4 flex w-full min-w-0 flex-col gap-2 rounded-[18px] border border-border bg-muted/30 p-3 sm:flex-row sm:items-start">
                              <code className="block max-h-48 min-h-10 w-full min-w-0 overflow-auto whitespace-pre-wrap break-all rounded-[16px] border border-border bg-background/85 px-3 py-2 font-mono text-[13px] leading-6">
                                {getSecretPreview(secret.id)}
                              </code>
                              <div className="flex shrink-0 justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => toggleSecretVisibility(secret.id)} disabled={isRevealing === secret.id}>
                                  {isRevealing === secret.id ? <Loader2 className="h-4 w-4 animate-spin" /> : visibleSecrets.has(secret.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                {visibleSecrets.has(secret.id) ? (
                                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => copySecret(secret.id)}>
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          )}

                          <p className="mt-4 text-[12px] font-bold tracking-wider uppercase text-muted-foreground/60">Updated {formatDateTime(secret.updatedAt)}</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 self-end overflow-hidden rounded-2xl border border-border bg-background/82 xl:self-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-none border-r border-border transition-colors"
                          asChild
                          title="Open secret details"
                        >
                          <Link href={`/dashboard/secrets/${secret.id}`}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        {permissions.canEditSecret ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-none border-r border-border transition-colors"
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
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-none border-r border-border transition-colors"
                          onClick={() => {
                            setActiveSecretId(secret.id);
                            setShowVersionsModal(true);
                          }}
                          title="Version History"
                        >
                          <History className="h-4 w-4 text-indigo-500" />
                        </Button>

                        {permissions.canDeleteSecret ? (
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
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="app-empty hermit-enter flex flex-col items-center justify-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
                <Lock className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-[16px] font-bold text-foreground">Nothing yet.</p>
              <p className="mt-1 max-w-sm text-[14px] font-medium text-muted-foreground">
                {searchQuery ? "No matching results." : "Create a folder or secret."}
              </p>
            </div>
          )}
        </section>

        {/* Versions Modal */}
        <Dialog open={showVersionsModal} onOpenChange={(open: boolean) => {
          setShowVersionsModal(open);
          if (!open) setActiveSecretId(null);
        }}>
          <DialogContent className="border border-border bg-background p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-border px-5 pb-4 pt-6 sm:px-8 sm:pt-8">
              <DialogTitle className="text-2xl font-semibold tracking-tight">Version History</DialogTitle>
            </DialogHeader>
            <div className="max-h-[min(70vh,44rem)] space-y-4 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
              {versionsLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : secretVersionsData?.versions?.length ? (
                <div className="divide-y divide-border">
                  {secretVersionsData.versions.map((version) => {
                    const vKey = `${activeSecretId}-v${version.versionNumber}`;
                    return (
                      <section key={version.id} className="space-y-4 py-5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Badge variant="secondary">v{version.versionNumber}</Badge>
                            {secretVersionsData.currentVersionId === version.id ? (
                              <Badge variant="outline">Current</Badge>
                            ) : null}
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(version.createdAt)}
                            </span>
                          </div>
                          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {version.createdBy?.firstName || version.createdBy?.email || "Unknown"}
                          </span>
                        </div>

                        <div className="text-sm leading-6 text-muted-foreground">
                          {version.commitMessage || "No commit message provided."}
                        </div>

                        {activePrompt === vKey ? (
                          <div className="flex flex-col gap-2 rounded-[18px] border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
                            <Input
                              type="password"
                              placeholder="Password"
                              className="h-9 bg-background text-sm sm:w-40"
                              autoComplete="current-password"
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
                                className="h-9"
                                disabled={isRevealing === vKey || !revealPassword}
                                onClick={() => activeSecretId && toggleVersionVisibility(activeSecretId, version.versionNumber, revealPassword)}
                              >
                                {isRevealing === vKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9"
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
                          <div className="flex min-w-0 flex-col gap-2 rounded-[18px] border border-border bg-muted/30 p-3 sm:flex-row sm:items-start">
                            <code className="block max-h-40 min-h-10 w-full min-w-0 overflow-auto whitespace-pre-wrap break-all rounded-[16px] border border-border bg-background/85 px-3 py-2 font-mono text-[13px] leading-6">
                              {getSecretPreview(vKey)}
                            </code>
                            <div className="flex shrink-0 justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => activeSecretId && toggleVersionVisibility(activeSecretId, version.versionNumber)}
                                disabled={isRevealing === vKey}
                                className="h-9 w-9"
                              >
                                {isRevealing === vKey ? <Loader2 className="h-4 w-4 animate-spin" /> : visibleSecrets.has(vKey) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {visibleSecrets.has(vKey) ? (
                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => activeSecretId && copySecret(activeSecretId, version.versionNumber)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="app-empty p-12">
                  <p className="text-[14px] font-semibold text-muted-foreground">No versions yet.</p>
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
