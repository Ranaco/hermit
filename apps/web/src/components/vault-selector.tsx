"use client";

import { useEffect } from "react";
import { Vault, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useVaults } from "@/hooks/use-vaults";
import { useOrganizationStore } from "@/store/organization.store";

interface VaultSelectorProps {
  onCreateNew?: () => void;
}

export function VaultSelector({ onCreateNew }: VaultSelectorProps) {
  const { currentOrganization, currentVault, setCurrentVault } = useOrganizationStore();
  const { data: vaults, isLoading } = useVaults(currentOrganization?.id);

  // Auto-select first vault if none selected
  useEffect(() => {
    if (!currentVault && vaults && vaults.length > 0) {
      setCurrentVault({
        id: vaults[0].id,
        name: vaults[0].name,
        organizationId: vaults[0].organizationId,
      });
    }
  }, [vaults, currentVault, setCurrentVault]);

  const handleSelectVault = (vaultId: string) => {
    const vault = vaults?.find(v => v.id === vaultId);
    if (vault) {
      setCurrentVault({
        id: vault.id,
        name: vault.name,
        organizationId: vault.organizationId,
      });
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Vault className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Select organization first</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Vault className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Loading vaults...</span>
      </div>
    );
  }

  if (!vaults || vaults.length === 0) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={onCreateNew}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Vault
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="vault-select" className="sr-only">Select Vault</Label>
        <div className="relative flex items-center">
          <Vault className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            id="vault-select"
            value={currentVault?.id || ""}
            onChange={(e) => handleSelectVault(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select vault</option>
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name} {vault._count && `(${vault._count.keys} keys)`}
              </option>
            ))}
          </select>
        </div>
      </div>
      {onCreateNew && (
        <Button variant="outline" size="icon" onClick={onCreateNew} title="Create New Vault">
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
