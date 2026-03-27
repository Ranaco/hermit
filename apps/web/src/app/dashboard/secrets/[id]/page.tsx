"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  FolderTree,
  History,
  KeyRound,
  Loader2,
  Lock,
  RefreshCcw,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteSecret,
  useSecret,
  useSecretVersions,
  useSetCurrentSecretVersion,
  useUpdateSecret,
} from "@/hooks/use-secrets";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { secretService, type SecretVersion } from "@/services/secret.service";

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

const toLocalDateTimeInput = (value?: string) => {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const fromLocalDateTimeInput = (value: string) => {
  if (!value) return undefined;
  return new Date(value).toISOString();
};

type PromptState = {
  targetKey: string;
  kind: "secret" | "vault";
};

export default function SecretDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const secretId = params?.id;

  const { data: secret, isLoading } = useSecret(secretId);
  const { data: versionsData, isLoading: versionsLoading } = useSecretVersions(
    secretId || "",
  );
  const { mutate: updateSecret, isPending: isUpdatingSecret } = useUpdateSecret();
  const { mutate: deleteSecret, isPending: isDeletingSecret } = useDeleteSecret();
  const { mutate: setCurrentVersion, isPending: isSwitchingVersion } =
    useSetCurrentSecretVersion();

  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [promptPassword, setPromptPassword] = useState("");
  const [revealingKey, setRevealingKey] = useState<string | null>(null);

  const [settingsForm, setSettingsForm] = useState({
    description: "",
    password: "",
    expiresAt: "",
  });
  const [rotateForm, setRotateForm] = useState({
    valueType: "STRING" as SecretValueType,
    value: "",
    commitMessage: "",
  });

  useEffect(() => {
    if (!secret) return;

    setSettingsForm({
      description: secret.description || "",
      password: "",
      expiresAt: toLocalDateTimeInput(secret.expiresAt),
    });
    setRotateForm({
      valueType: secret.valueType,
      value: "",
      commitMessage: "",
    });
  }, [secret]);

  const versions = versionsData?.versions || [];
  const currentVersionId = secret?.currentVersion?.id || versionsData?.currentVersionId;
  const latestVersionId = secret?.latestVersion?.id || versions[0]?.id;
  const currentValueKey = "current";

  const stats = useMemo(() => {
    if (!secret) return [];

    return [
      {
        label: "Current version",
        value: secret.currentVersion
          ? `v${secret.currentVersion.versionNumber}`
          : "Missing",
        detail: secret.currentVersion
          ? `Active since ${formatDateTime(secret.currentVersion.createdAt)}`
          : "No active version",
        icon: History,
      },
      {
        label: "Latest stored version",
        value: secret.latestVersion
          ? `v${secret.latestVersion.versionNumber}`
          : "Missing",
        detail: secret.latestVersion
          ? `${secret.versionCount || versions.length} version${
              (secret.versionCount || versions.length) === 1 ? "" : "s"
            } total`
          : "No history available",
        icon: RefreshCcw,
      },
      {
        label: "Protection",
        value: secret.hasPassword ? "Secret password" : "Auth or vault policy",
        detail: secret.expiresAt
          ? `Expires ${formatDate(secret.expiresAt)}`
          : "No expiry set",
        icon: Shield,
      },
    ];
  }, [secret, versions.length]);

  const revealValue = async (
    targetKey: string,
    options?: { versionNumber?: number; password?: string; vaultPassword?: string },
  ) => {
    if (!secretId) return;

    if (visibleValues.has(targetKey) && !options?.password && !options?.vaultPassword) {
      setVisibleValues((prev) => {
        const next = new Set(prev);
        next.delete(targetKey);
        return next;
      });
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[targetKey];
        return next;
      });
      setPromptState(null);
      setPromptPassword("");
      return;
    }

    setRevealingKey(targetKey);

    try {
      const response = await secretService.reveal(secretId, {
        versionNumber: options?.versionNumber,
        password: options?.password,
        vaultPassword: options?.vaultPassword,
      });

      if (response.requiresPassword) {
        setPromptState({ targetKey, kind: response.requiresPassword });
        if (options?.password || options?.vaultPassword) {
          toast.error("Incorrect password");
          setPromptPassword("");
        }
        return;
      }

      if (!response.secret?.value) {
        toast.error("Unable to reveal secret value");
        return;
      }

      setVisibleValues((prev) => new Set(prev).add(targetKey));
      setRevealedValues((prev) => ({
        ...prev,
        [targetKey]: response.secret?.value || "",
      }));
      setPromptState(null);
      setPromptPassword("");
    } catch {
      toast.error("Failed to reveal secret");
    } finally {
      setRevealingKey(null);
    }
  };

  const submitPrompt = (version?: SecretVersion) => {
    if (!promptState) return;

    const targetVersionNumber =
      version?.versionNumber || secret?.currentVersion?.versionNumber;

    revealValue(promptState.targetKey, {
      versionNumber:
        promptState.targetKey === currentValueKey ? undefined : targetVersionNumber,
      password: promptState.kind === "secret" ? promptPassword : undefined,
      vaultPassword: promptState.kind === "vault" ? promptPassword : undefined,
    });
  };

  const copyValue = async (targetKey: string) => {
    const value = revealedValues[targetKey];
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    if (!secretId) return;

    updateSecret(
      {
        id: secretId,
        data: {
          description: settingsForm.description || undefined,
          password: settingsForm.password || undefined,
          expiresAt: settingsForm.expiresAt
            ? fromLocalDateTimeInput(settingsForm.expiresAt)
            : null,
        },
      },
      {
        onSuccess: () => {
          setSettingsForm((prev) => ({
            ...prev,
            password: "",
          }));
        },
      },
    );
  };

  const handleRotateSecret = (event: React.FormEvent) => {
    event.preventDefault();
    if (!secretId || !rotateForm.value.trim()) {
      toast.error("Enter a new value to create a version");
      return;
    }

    updateSecret(
      {
        id: secretId,
        data: {
          valueType: rotateForm.valueType,
          value: rotateForm.value,
          commitMessage: rotateForm.commitMessage || undefined,
        },
      },
      {
        onSuccess: () => {
          setRotateForm({
            valueType: secret?.valueType || "STRING",
            value: "",
            commitMessage: "",
          });
          setVisibleValues(new Set());
          setRevealedValues({});
          setPromptState(null);
          setPromptPassword("");
        },
      },
    );
  };

  const handleSetCurrentVersion = (versionId: string) => {
    if (!secretId) return;
    setCurrentVersion({ id: secretId, versionId });
  };

  const handleDeleteSecret = () => {
    if (!secretId || !secret) return;
    if (!confirm(`Delete secret "${secret.name}"?`)) return;

    deleteSecret(secretId, {
      onSuccess: () => {
        router.push("/dashboard/secrets");
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!secretId || !secret) {
    return (
      <DashboardLayout>
        <div className="app-empty">
          <Lock className="mx-auto mb-3 h-8 w-8" />
          <p className="text-base font-medium text-foreground">Secret not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/secrets">Back to secrets</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-4 border-b border-border pb-6">
          <Link
            href="/dashboard/secrets"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to secrets
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="app-eyebrow">Secret detail</p>
                {secret.currentVersion ? (
                  <Badge variant="secondary">Current v{secret.currentVersion.versionNumber}</Badge>
                ) : null}
                {secret.latestVersion ? (
                  <Badge variant="outline">Latest v{secret.latestVersion.versionNumber}</Badge>
                ) : null}
                {currentVersionId && latestVersionId && currentVersionId !== latestVersionId ? (
                  <Badge variant="outline">Pinned to older version</Badge>
                ) : null}
              </div>

              <div>
                <h1 className="text-[clamp(2rem,3vw,2.8rem)] font-semibold tracking-tight text-foreground">
                  {secret.name}
                </h1>
                <p className="mt-2 max-w-[64ch] text-[15px] leading-7 text-muted-foreground">
                  {secret.description || "Versioned secret."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteSecret}
                disabled={isDeletingSecret}
              >
                {isDeletingSecret ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {stat.detail}
                  </p>
                </div>
                <stat.icon className="mt-1 h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current value</CardTitle>
                <CardDescription>
                  Default reads use the current version.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Vault
                    </p>
                    <p className="text-sm font-medium text-foreground">{secret.vault?.name}</p>
                  </div>
                  <div className="space-y-1 border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Key
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      {secret.key?.name}
                    </p>
                  </div>
                  <div className="space-y-1 border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Folder
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      {secret.group?.name || "Root"}
                    </p>
                  </div>
                </div>

                {promptState?.targetKey === currentValueKey ? (
                  <div className="flex flex-col gap-3 border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {promptState.kind === "secret"
                          ? "Secret password required"
                          : "Vault password required"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Enter the {promptState.kind === "secret" ? "secret" : "vault"} password to reveal the active value.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Input
                        type="password"
                        value={promptPassword}
                        onChange={(event) => setPromptPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            submitPrompt();
                          }
                        }}
                        className="sm:w-56"
                        autoFocus
                      />
                      <Button
                        onClick={() => submitPrompt()}
                        disabled={!promptPassword || revealingKey === currentValueKey}
                      >
                        {revealingKey === currentValueKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border border-border bg-muted/30 p-3">
                  <code className="block min-h-32 w-full overflow-auto whitespace-pre-wrap break-all border border-border bg-background px-4 py-3 font-mono text-[13px] leading-6 text-foreground">
                    {visibleValues.has(currentValueKey)
                      ? revealedValues[currentValueKey]
                      : "********"}
                  </code>
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => revealValue(currentValueKey)}
                        disabled={revealingKey === currentValueKey}
                      >
                        {revealingKey === currentValueKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : visibleValues.has(currentValueKey) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {visibleValues.has(currentValueKey) ? "Hide" : "Reveal"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => copyValue(currentValueKey)}
                        disabled={!visibleValues.has(currentValueKey)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {secret.currentVersion
                        ? `Reading current v${secret.currentVersion.versionNumber}`
                        : "No current version selected"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
              <CardHeader>
                <CardTitle>Secret setup</CardTitle>
                <CardDescription>
                    Update metadata, password, and expiry.
                </CardDescription>
              </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSaveSettings}>
                    <div className="space-y-2">
                      <Label htmlFor="secret-description">Description</Label>
                      <Textarea
                        id="secret-description"
                        value={settingsForm.description}
                        onChange={(event) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Explain what this secret is used for"
                        className="min-h-28"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secret-password">Secret password</Label>
                      <Input
                        id="secret-password"
                        type="password"
                        minLength={8}
                        value={settingsForm.password}
                        onChange={(event) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            password: event.target.value,
                          }))
                        }
                        placeholder={
                          secret.hasPassword
                            ? "Leave blank to keep the current password"
                            : "Add a secret-level password"
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secret-expiry">Expiry</Label>
                      <Input
                        id="secret-expiry"
                        type="datetime-local"
                        value={settingsForm.expiresAt}
                        onChange={(event) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            expiresAt: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <Button type="submit" disabled={isUpdatingSecret}>
                      {isUpdatingSecret ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Save setup
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
              <CardHeader>
                <CardTitle>Rotate value</CardTitle>
                <CardDescription>
                    A new value becomes current.
                </CardDescription>
              </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleRotateSecret}>
                    <div className="space-y-2">
                      <Label htmlFor="secret-value-type">Value type</Label>
                      <Select
                        value={rotateForm.valueType}
                        onValueChange={(value: SecretValueType) =>
                          setRotateForm((prev) => ({
                            ...prev,
                            valueType: value,
                            value: prev.value ? prev.value : getDefaultSecretValue(value),
                          }))
                        }
                      >
                        <SelectTrigger id="secret-value-type">
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECRET_VALUE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secret-value">New value</Label>
                      <Textarea
                        id="secret-value"
                        value={rotateForm.value}
                        onChange={(event) =>
                          setRotateForm((prev) => ({
                            ...prev,
                            value: event.target.value,
                          }))
                        }
                        placeholder={
                          rotateForm.valueType === "JSON"
                            ? '{\n  "key": "value"\n}'
                            : "Enter the new secret value"
                        }
                        className="min-h-32 font-mono text-[13px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secret-commit-message">Commit message</Label>
                      <Input
                        id="secret-commit-message"
                        value={rotateForm.commitMessage}
                        onChange={(event) =>
                          setRotateForm((prev) => ({
                            ...prev,
                            commitMessage: event.target.value,
                          }))
                        }
                        placeholder="Why is this version changing?"
                      />
                    </div>

                    <Button type="submit" disabled={isUpdatingSecret}>
                      {isUpdatingSecret ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Create new version
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Version history</CardTitle>
                <CardDescription>
                  Latest and current are separate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {versionsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : versions.length ? (
                  versions.map((version) => {
                    const versionKey = `version-${version.id}`;
                    const isCurrent = currentVersionId === version.id;
                    const isLatest = latestVersionId === version.id;
                    const promptForThisVersion =
                      promptState?.targetKey === versionKey;

                    return (
                      <section
                        key={version.id}
                        className="space-y-4 border border-border p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">v{version.versionNumber}</Badge>
                              {isCurrent ? <Badge variant="outline">Current</Badge> : null}
                              {isLatest ? <Badge variant="outline">Latest</Badge> : null}
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {version.commitMessage || "No commit message provided."}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                {version.createdBy?.firstName ||
                                  version.createdBy?.email ||
                                  "Unknown"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-4 w-4" />
                                {formatDateTime(version.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!isCurrent ? (
                              <Button
                                variant="outline"
                                onClick={() => handleSetCurrentVersion(version.id)}
                                disabled={isSwitchingVersion}
                              >
                                {isSwitchingVersion ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Make current
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              onClick={() =>
                                revealValue(versionKey, {
                                  versionNumber: version.versionNumber,
                                })
                              }
                              disabled={revealingKey === versionKey}
                            >
                              {revealingKey === versionKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : visibleValues.has(versionKey) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              {visibleValues.has(versionKey) ? "Hide" : "Reveal"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => copyValue(versionKey)}
                              disabled={!visibleValues.has(versionKey)}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </div>

                        {promptForThisVersion ? (
                          <div className="flex flex-col gap-3 border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {promptState?.kind === "secret"
                                  ? "Secret password required"
                                  : "Vault password required"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Enter the {promptState?.kind === "secret" ? "secret" : "vault"} password to reveal v{version.versionNumber}.
                              </p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                              <Input
                                type="password"
                                value={promptPassword}
                                onChange={(event) => setPromptPassword(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    submitPrompt(version);
                                  }
                                }}
                                className="sm:w-56"
                                autoFocus
                              />
                              <Button
                                onClick={() => submitPrompt(version)}
                                disabled={!promptPassword || revealingKey === versionKey}
                              >
                                {revealingKey === versionKey ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Verify"
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        <div className="border border-border bg-muted/30 p-3">
                          <code
                            className={cn(
                              "block min-h-20 overflow-auto whitespace-pre-wrap break-all border border-border bg-background px-4 py-3 font-mono text-[13px] leading-6 text-foreground",
                            )}
                          >
                            {visibleValues.has(versionKey)
                              ? revealedValues[versionKey]
                              : "********"}
                          </code>
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <div className="app-empty">
                    <History className="mx-auto mb-3 h-8 w-8" />
                    No versions yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Secret metadata</CardTitle>
                <CardDescription>
                  Key metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Value type
                  </p>
                  <p className="font-medium text-foreground">{secret.valueType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Created
                  </p>
                  <p className="font-medium text-foreground">{formatDateTime(secret.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Last updated
                  </p>
                  <p className="font-medium text-foreground">{formatDateTime(secret.updatedAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Last accessed
                  </p>
                  <p className="font-medium text-foreground">
                    {secret.lastAccessedAt ? formatDateTime(secret.lastAccessedAt) : "Never"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Access count
                  </p>
                  <p className="font-medium text-foreground">{secret.accessCount || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Expiry
                  </p>
                  <p className="font-medium text-foreground">
                    {secret.expiresAt ? formatDateTime(secret.expiresAt) : "No expiry"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Version model</CardTitle>
                <CardDescription>
                  Current can point to an older version.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>New values create the next version and become current.</p>
                <p>Making an older version current only moves the pointer.</p>
                <p>Version-specific reveal reads that version directly.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
