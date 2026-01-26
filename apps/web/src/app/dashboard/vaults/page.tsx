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
import { useVaults, useCreateVault, useDeleteVault } from "@/hooks/use-vaults";
import { useOrganizationStore } from "@/store/organization.store";
import {
  Plus,
  Trash2,
  Search,
  Vault as VaultIcon,
  Building2,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function VaultsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newVault, setNewVault] = useState({
    name: "",
    description: "",
  });

  const { currentOrganization } = useOrganizationStore();
  const { data: vaults, isLoading } = useVaults(currentOrganization?.id);
  const { mutate: createVault, isPending: isCreating } = useCreateVault();
  const { mutate: deleteVault } = useDeleteVault();

  const filteredVaults = vaults?.filter((vault) =>
    vault.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    createVault(
      {
        ...newVault,
        organizationId: currentOrganization.id,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewVault({ name: "", description: "" });
        },
      },
    );
  };

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="shadow-md max-w-md">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg mb-4">
                Select an organization to view vaults
              </p>
              <p className="text-sm text-muted-foreground">
                Use the organization selector in the sidebar to choose an
                organization.
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
            <h1 className="text-4xl font-bold mb-2">Vaults</h1>
            <p className="text-muted-foreground text-lg">
              Secure storage containers for{" "}
              <strong>{currentOrganization.name}</strong>
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(!showCreateDialog)}
            className="shadow-md"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Vault
          </Button>
        </div>

        {/* Create Vault Form */}
        {showCreateDialog && (
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle>Create New Vault</CardTitle>
              <CardDescription>
                Create a new secure storage vault in {currentOrganization.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateVault} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vault-name">Vault Name</Label>
                  <Input
                    id="vault-name"
                    placeholder="Production Vault"
                    value={newVault.name}
                    onChange={(e) =>
                      setNewVault({ ...newVault, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vault-description">Description</Label>
                  <Input
                    id="vault-description"
                    placeholder="Vault for production secrets"
                    value={newVault.description}
                    onChange={(e) =>
                      setNewVault({ ...newVault, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !newVault.name}>
                    {isCreating ? "Creating..." : "Create Vault"}
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
            placeholder="Search vaults..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Vaults Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading vaults...
              </CardContent>
            </Card>
          ) : filteredVaults && filteredVaults.length > 0 ? (
            filteredVaults.map((vault) => (
              <Card
                key={vault.id}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-accent/10 border-2 border-border">
                      <VaultIcon className="h-8 w-8 text-accent" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to delete "${vault.name}"?`,
                          )
                        ) {
                          deleteVault(vault.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="mt-4">{vault.name}</CardTitle>
                  <CardDescription>{vault.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Keys
                      </span>
                      <Badge variant="outline">
                        {vault._count?.keys || 0} keys
                      </Badge>
                    </div>
                    <div className="pt-3 border-t-2 border-border">
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDateTime(vault.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {vault.id}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-md md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center">
                <VaultIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">
                  {searchQuery
                    ? "No vaults found matching your search"
                    : "No vaults yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first vault to start storing keys and secrets.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
