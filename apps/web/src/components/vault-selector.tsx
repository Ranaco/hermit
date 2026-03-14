"use client";

import { useEffect } from "react";
import { Vault, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useVaults } from "@/hooks/use-vaults";
import { useOrganizationStore } from "@/store/organization.store";

interface VaultSelectorProps {
  onCreateNew?: () => void;
}

export function VaultSelector({ onCreateNew }: VaultSelectorProps) {
  const { currentOrganization, currentVault, setCurrentVault } = useOrganizationStore();
  const { data: vaults, isLoading } = useVaults(currentOrganization?.id);

  useEffect(() => {
    if (!vaults) {
      return;
    }

    if (vaults.length === 0) {
      if (currentVault) {
        setCurrentVault(null);
      }
      return;
    }

    if (!currentVault) {
      setCurrentVault({
        id: vaults[0].id,
        name: vaults[0].name,
        organizationId: vaults[0].organizationId,
      });
      return;
    }

    const matchingVault = vaults.find((vault) => vault.id === currentVault.id);

    if (!matchingVault) {
      setCurrentVault({
        id: vaults[0].id,
        name: vaults[0].name,
        organizationId: vaults[0].organizationId,
      });
      return;
    }

    if (
      matchingVault.name !== currentVault.name ||
      matchingVault.organizationId !== currentVault.organizationId
    ) {
      setCurrentVault({
        id: matchingVault.id,
        name: matchingVault.name,
        organizationId: matchingVault.organizationId,
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

  const vaultItems = vaults.map((vault) => ({
    value: vault.id,
    label: vault.name,
    description: vault._count ? `${vault._count.keys} keys` : undefined,
    keywords: [vault.organizationId],
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="vault-select" className="sr-only">
          Select Vault
        </Label>
        <div className="relative">
          <Vault className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Combobox
            items={vaultItems}
            value={currentVault?.id}
            placeholder="Select vault"
            searchPlaceholder="Search vaults..."
            emptyText="No vaults found."
            onValueChange={handleSelectVault}
            triggerClassName="border-sidebar-border bg-sidebar/95 pl-10 pr-4 focus-visible:ring-sidebar-ring"
          />
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
