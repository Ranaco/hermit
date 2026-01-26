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
  const { currentOrganization, currentVault, setCurrentOrganization, setCurrentVault } =
    useOrganizationStore();
  const { data: organizations, isLoading: orgsLoading } = useOrganizations();
  const { data: vaults, isLoading: vaultsLoading } = useVaults(currentOrganization?.id);

  useEffect(() => {
    // Auto-select first organization if none is selected
    if (!orgsLoading && organizations && organizations.length > 0 && !currentOrganization) {
      const firstOrg = organizations[0];
      setCurrentOrganization({
        id: firstOrg.id,
        name: firstOrg.name,
        description: firstOrg.description,
        userRole: firstOrg.userRole,
      });
    }
  }, [organizations, orgsLoading, currentOrganization, setCurrentOrganization]);

  useEffect(() => {
    // Auto-select first vault if none is selected (or if current vault doesn't belong to current org)
    if (
      !vaultsLoading &&
      vaults &&
      vaults.length > 0 &&
      currentOrganization &&
      (!currentVault || currentVault.organizationId !== currentOrganization.id)
    ) {
      const firstVault = vaults[0];
      setCurrentVault({
        id: firstVault.id,
        name: firstVault.name,
        organizationId: firstVault.organization?.id || currentOrganization.id,
      });
    }
  }, [vaults, vaultsLoading, currentOrganization, currentVault, setCurrentVault]);

  return {
    isLoading: orgsLoading || vaultsLoading,
    hasOrganization: !!currentOrganization,
    hasVault: !!currentVault,
  };
}
