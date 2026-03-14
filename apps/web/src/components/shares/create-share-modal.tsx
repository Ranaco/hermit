"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateShare } from "@/hooks/use-shares";
import { useKeys } from "@/hooks/use-keys";
import { useSecrets } from "@/hooks/use-secrets";
import type { Secret } from "@/services/secret.service";
import { useOrganizationStore } from "@/store/organization.store";
import { CheckCircle2, Copy, Link2, Lock, Timer } from "lucide-react";

interface CreateShareModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateShareModal({ isOpen, onOpenChange }: CreateShareModalProps) {
  const { currentVault } = useOrganizationStore();
  const { data: keys } = useKeys(currentVault?.id);
  const { data: secretsData } = useSecrets(currentVault?.id);

  const [mode, setMode] = useState<"text" | "vault">("text");
  const [value, setValue] = useState("");
  const [secretId, setSecretId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [note, setNote] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate: createShare, isPending } = useCreateShare();

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

  const secretItems = useMemo(
    () =>
      secretsData?.secrets?.map((secret: Secret) => ({
        value: secret.id,
        label: secret.name,
        description: `v${secret.currentVersion?.versionNumber || 1}`,
        keywords: [secret.key?.name || "", secret.valueType || ""],
      })) || [],
    [secretsData?.secrets],
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createShare(
      {
        keyId,
        value: mode === "text" ? value : undefined,
        secretId: mode === "vault" ? secretId : undefined,
        passphrase: passphrase || undefined,
        expiresInHours,
        note: note || undefined,
      },
      {
        onSuccess: (data) => {
          setCreatedUrl(`${window.location.origin}/share/${data.token}`);
        },
      },
    );
  };

  const copyToClipboard = () => {
    if (!createdUrl) return;
    navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCreatedUrl(null);
    setCopied(false);
    setMode("text");
    setValue("");
    setSecretId("");
    setKeyId("");
    setPassphrase("");
    setExpiresInHours(24);
    setNote("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        {createdUrl ? (
          <div className="space-y-6">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <DialogTitle className="pt-2">One-time share created</DialogTitle>
              <DialogDescription>
                This link will expire on schedule and can only be opened once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Label htmlFor="share-url">Share link</Label>
              <div className="flex gap-2">
                <Input id="share-url" readOnly value={createdUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <DialogHeader className="border-b border-border pb-4">
              <DialogTitle className="inline-flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Create one-time share
              </DialogTitle>
              <DialogDescription>
                Share a value or a vault secret with a single-use link.
              </DialogDescription>
            </DialogHeader>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Source</legend>
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  aria-pressed={mode === "text"}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    mode === "text" ? "bg-background text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Custom text
                </button>
                <button
                  type="button"
                  onClick={() => setMode("vault")}
                  aria-pressed={mode === "vault"}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    mode === "vault" ? "bg-background text-foreground" : "text-muted-foreground"
                  }`}
                >
                  From vault
                </button>
              </div>

              {mode === "text" ? (
                <div className="space-y-2">
                  <Label htmlFor="share-value">Secret value</Label>
                  <Textarea
                    id="share-value"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter the value to share"
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="share-secret">Vault secret</Label>
                  <Combobox
                    items={secretItems}
                    value={secretId}
                    placeholder="Select a secret"
                    searchPlaceholder="Search secrets..."
                    emptyText="No secrets found."
                    onValueChange={setSecretId}
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <legend className="sr-only">Share configuration</legend>
              <div className="space-y-2">
                <Label htmlFor="share-key">Encryption key</Label>
                <Combobox
                  items={keyItems}
                  value={keyId}
                  placeholder="Select key"
                  searchPlaceholder="Search keys..."
                  emptyText="No keys found."
                  onValueChange={setKeyId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="share-expiration" className="inline-flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  Expiration
                </Label>
                <Select
                  value={String(expiresInHours)}
                  onValueChange={(next) => setExpiresInHours(Number(next))}
                >
                  <SelectTrigger id="share-expiration">
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="share-passphrase" className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Passphrase
                </Label>
                <Input
                  id="share-passphrase"
                  type="password"
                  placeholder="Optional extra protection"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="share-note">Note</Label>
                <Input
                  id="share-note"
                  placeholder="Optional note for the recipient"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || (!value && mode === "text") || (!secretId && mode === "vault") || !keyId}
              >
                {isPending ? "Generating..." : "Generate link"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
