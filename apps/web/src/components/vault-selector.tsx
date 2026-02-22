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
    const vault = vaults?.find((v) => v.id === vaultId);
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
      <div className="flex h-10 items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/35 px-3 text-xs text-muted-foreground">
        <Vault className="h-4 w-4" />
        Select organization first
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/35 px-3 text-xs text-muted-foreground">
        <Vault className="h-4 w-4" />
        Loading vaults...
      </div>
    );
  }

  if (!vaults || vaults.length === 0) {
    return (
      <Button variant="outline" className="h-10 w-full justify-start rounded-xl" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Create Vault
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="vault-select" className="sr-only">
          Select Vault
        </Label>
        <div className="relative flex items-center">
          <Vault className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <select
            id="vault-select"
            value={currentVault?.id || ""}
            onChange={(e) => handleSelectVault(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-sidebar-border bg-sidebar/95 pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sidebar-ring"
          >
            <option value="">Select vault</option>
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name} {vault._count ? `(${vault._count.keys} keys)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {onCreateNew ? (
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={onCreateNew} title="Create vault">
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
