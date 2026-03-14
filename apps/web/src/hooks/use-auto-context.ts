/**
 * Auto Context Hook
 * Automatically sets organization and vault context for the user
 */

import { useEffect } from "react";
import { useOrganizations } from "./use-organizations";
import { useVaults } from "./use-vaults";
import { useOrganizationStore } from "@/store/organization.store";

/**
 * Automatically select organization and vault if none is selected
 * This ensures there's always a context for operations
 */
export function useAutoContext() {
  const { currentOrganization, currentVault, setCurrentOrganization, setCurrentVault, clearVault } =
    useOrganizationStore();
  const { data: organizations, isLoading: orgsLoading } = useOrganizations();
  const { data: vaults, isLoading: vaultsLoading } = useVaults(currentOrganization?.id);

  useEffect(() => {
    if (orgsLoading || !organizations) {
      return;
    }

    if (organizations.length === 0) {
      if (currentOrganization) {
        setCurrentOrganization(null);
        clearVault();
      }
      return;
    }

    if (!currentOrganization) {
      const firstOrg = organizations[0];
      setCurrentOrganization({
        id: firstOrg.id,
        name: firstOrg.name,
        description: firstOrg.description,
        userRole: firstOrg.userRole,
      });
      return;
    }

    const matchingOrganization = organizations.find((organization) => organization.id === currentOrganization.id);

    if (!matchingOrganization) {
      const firstOrg = organizations[0];
      setCurrentOrganization({
        id: firstOrg.id,
        name: firstOrg.name,
        description: firstOrg.description,
        userRole: firstOrg.userRole,
      });
      clearVault();
      return;
    }

    if (
      matchingOrganization.name !== currentOrganization.name ||
      matchingOrganization.description !== currentOrganization.description ||
      matchingOrganization.userRole !== currentOrganization.userRole
    ) {
      setCurrentOrganization({
        id: matchingOrganization.id,
        name: matchingOrganization.name,
        description: matchingOrganization.description,
        userRole: matchingOrganization.userRole,
      });
    }
  }, [organizations, orgsLoading, currentOrganization, setCurrentOrganization, clearVault]);

  useEffect(() => {
    // Auto-select first vault if none is selected (or if current vault doesn't belong to current org)
    if (vaultsLoading || !currentOrganization || !vaults) {
      return;
    }

    if (vaults.length === 0) {
      if (currentVault) {
        setCurrentVault(null);
      }
      return;
    }

    if (!currentVault || currentVault.organizationId !== currentOrganization.id) {
      const firstVault = vaults[0];
      setCurrentVault({
        id: firstVault.id,
        name: firstVault.name,
        organizationId: firstVault.organization?.id || currentOrganization.id,
      });
      return;
    }

    const matchingVault = vaults.find((vault) => vault.id === currentVault.id);

    if (!matchingVault) {
      const firstVault = vaults[0];
      setCurrentVault({
        id: firstVault.id,
        name: firstVault.name,
        organizationId: firstVault.organization?.id || currentOrganization.id,
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
  }, [vaults, vaultsLoading, currentOrganization, currentVault, setCurrentVault]);

  return {
    isLoading: orgsLoading || vaultsLoading,
    hasOrganization: !!currentOrganization,
    hasVault: !!currentVault,
  };
}
