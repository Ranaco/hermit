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
  useKeys,
  useCreateKey,
  useDeleteKey,
  useRotateKey,
} from "@/hooks/use-keys";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Key as KeyIcon,
  Vault,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function KeysPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState({
    name: "",
    description: "",
    valueType: "STRING" as
      | "STRING"
      | "JSON"
      | "NUMBER"
      | "BOOLEAN"
      | "MULTILINE",
  });

  const { currentVault } = useOrganizationStore();
  const { data: keys, isLoading } = useKeys(currentVault?.id);
  const { mutate: createKey, isPending: isCreating } = useCreateKey();
  const { mutate: deleteKey } = useDeleteKey();
  const { mutate: rotateKey } = useRotateKey();

  const filteredKeys = keys?.filter((key) =>
    key.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
          setShowCreateDialog(false);
          setNewKey({
            name: "",
            description: "",
            valueType: "STRING",
          });
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
                Select a vault to view keys
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
            <h1 className="text-4xl font-bold mb-2">Encryption Keys</h1>
            <p className="text-muted-foreground text-lg">
              Manage cryptographic keys in <strong>{currentVault.name}</strong>
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(!showCreateDialog)}
            className="shadow-md"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Key
          </Button>
        </div>

        {/* Create Key Form */}
        {showCreateDialog && (
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle>Create New Key</CardTitle>
              <CardDescription>
                Generate a new encryption key in {currentVault.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="my-encryption-key"
                      value={newKey.name}
                      onChange={(e) =>
                        setNewKey({ ...newKey, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value-type">Value Type</Label>
                    <select
                      id="value-type"
                      className="flex h-10 w-full border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newKey.valueType}
                      onChange={(e) =>
                        setNewKey({
                          ...newKey,
                          valueType: e.target.value as
                            | "STRING"
                            | "JSON"
                            | "NUMBER"
                            | "BOOLEAN"
                            | "MULTILINE",
                        })
                      }
                    >
                      <option value="STRING">String</option>
                      <option value="JSON">JSON</option>
                      <option value="NUMBER">Number</option>
                      <option value="BOOLEAN">Boolean</option>
                      <option value="MULTILINE">Multiline</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="key-description">Description</Label>
                    <Input
                      id="key-description"
                      placeholder="Key for encrypting user data"
                      value={newKey.description}
                      onChange={(e) =>
                        setNewKey({ ...newKey, description: e.target.value })
                      }
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
                  <Button type="submit" disabled={isCreating || !newKey.name}>
                    {isCreating ? "Creating..." : "Create Key"}
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
            placeholder="Search keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Keys List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading keys...
              </CardContent>
            </Card>
          ) : filteredKeys && filteredKeys.length > 0 ? (
            filteredKeys.map((key) => (
              <Card
                key={key.id}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 border-2 border-border">
                        <KeyIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">{key.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary">{key.valueType}</Badge>
                        </div>
                        {key.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {key.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Created: {formatDateTime(key.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {key.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => rotateKey(key.id)}
                        title="Rotate Key"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete "${key.name}"?`,
                            )
                          ) {
                            deleteKey(key.id);
                          }
                        }}
                        title="Delete Key"
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
                <KeyIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">
                  {searchQuery
                    ? "No keys found matching your search"
                    : "No keys yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first key to start encrypting secrets.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
