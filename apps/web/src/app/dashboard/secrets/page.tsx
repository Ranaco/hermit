"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { Badge } from "@/components/ui/badge";
import {
  useSecrets,
  useCreateSecret,
  useDeleteSecret,
} from "@/hooks/use-secrets";
import { secretService } from "@/services/secret.service";
import { useKeys } from "@/hooks/use-keys";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Plus,
  Trash2,
  Search,
  Lock,
  Eye,
  EyeOff,
  Vault,
  Key,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function SecretsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [revealedSecrets, setRevealedSecrets] = useState<
    Record<string, string>
  >({});
  const [newSecret, setNewSecret] = useState({
    name: "",
    description: "",
    value: "",
    keyId: "",
  });

  const { currentVault } = useOrganizationStore();
  const { data: secrets, isLoading: secretsLoading } = useSecrets(
    currentVault?.id,
  );
  const { data: keys } = useKeys(currentVault?.id);
  const { mutate: createSecret, isPending: isCreating } = useCreateSecret();
  const { mutate: deleteSecret } = useDeleteSecret();

  const filteredSecrets = secrets?.secrets?.filter((secret) =>
    secret.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleSecretVisibility = async (secretId: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(secretId)) {
      newVisible.delete(secretId);
      setVisibleSecrets(newVisible);
      // Remove from revealed secrets
      setRevealedSecrets((prev) => {
        const updated = { ...prev };
        delete updated[secretId];
        return updated;
      });
    } else {
      // Reveal the secret using the service directly
      try {
        const response = await secretService.reveal(secretId);
        if (response.secret?.value) {
          newVisible.add(secretId);
          setVisibleSecrets(newVisible);
          setRevealedSecrets((prev) => ({
            ...prev,
            [secretId]: response.secret?.value || "",
          }));
        }
      } catch (error) {
        console.error("Failed to reveal secret:", error);
        // Could show a toast here
      }
    }
  };

  const handleCreateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVault) return;

    createSecret(
      {
        ...newSecret,
        vaultId: currentVault.id,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewSecret({ name: "", description: "", value: "", keyId: "" });
        },
      },
    );
  };

  if (!currentVault) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="shadow-md max-w-md">
            <CardContent className="py-12 text-center">
              <Vault className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg mb-4">
                Select a vault to view secrets
              </p>
              <p className="text-sm text-muted-foreground">
                Use the vault selector in the sidebar to choose a vault.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Secrets</h1>
            <p className="text-muted-foreground text-lg">
              Manage encrypted secrets in <strong>{currentVault.name}</strong>
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(!showCreateDialog)}
            className="shadow-md"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Secret
          </Button>
        </div>

        {/* Create Secret Form */}
        {showCreateDialog && (
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle>Create New Secret</CardTitle>
              <CardDescription>
                Store a new secret securely in {currentVault.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSecret} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="secret-name">Secret Name</Label>
                    <Input
                      id="secret-name"
                      placeholder="DATABASE_PASSWORD"
                      value={newSecret.name}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secret-key">Encryption Key</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <select
                        id="secret-key"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={newSecret.keyId}
                        onChange={(e) =>
                          setNewSecret({ ...newSecret, keyId: e.target.value })
                        }
                        required
                      >
                        <option value="">Select a key</option>
                        {keys?.map((key) => (
                          <option key={key.id} value={key.id}>
                            {key.name} ({key.valueType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="secret-description">Description</Label>
                    <Input
                      id="secret-description"
                      placeholder="Database connection password"
                      value={newSecret.description}
                      onChange={(e) =>
                        setNewSecret({
                          ...newSecret,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="secret-value">Secret Value</Label>
                    <Input
                      id="secret-value"
                      type="password"
                      placeholder="your-secret-value"
                      value={newSecret.value}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, value: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isCreating ||
                      !newSecret.name ||
                      !newSecret.value ||
                      !newSecret.keyId
                    }
                  >
                    {isCreating ? "Creating..." : "Create Secret"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search secrets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Secrets List */}
        <div className="grid gap-4">
          {secretsLoading ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading secrets...
              </CardContent>
            </Card>
          ) : filteredSecrets && filteredSecrets.length > 0 ? (
            filteredSecrets.map((secret) => (
              <Card
                key={secret.id}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-secondary/10 border-2 border-border">
                        <Lock className="h-6 w-6 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">
                          {secret.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            v{secret.currentVersion?.versionNumber || 1}
                          </Badge>
                          {secret.key && (
                            <Badge variant="secondary">
                              <Key className="h-3 w-3 mr-1" />
                              {secret.key.name}
                            </Badge>
                          )}
                        </div>
                        {secret.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {secret.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm bg-muted px-3 py-1 border-2 border-border font-mono flex-1">
                            {visibleSecrets.has(secret.id)
                              ? revealedSecrets[secret.id] || "Loading..."
                              : "••••••••••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSecretVisibility(secret.id)}
                          >
                            {visibleSecrets.has(secret.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            Updated: {formatDateTime(secret.updatedAt)}
                          </span>
                          <span>ID: {secret.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete "${secret.name}"?`,
                            )
                          ) {
                            deleteSecret(secret.id);
                          }
                        }}
                        title="Delete Secret"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">
                  {searchQuery
                    ? "No secrets found matching your search"
                    : "No secrets yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first secret to start storing sensitive data
                  securely.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
