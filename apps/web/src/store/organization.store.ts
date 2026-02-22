import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Organization {
  id: string;
  name: string;
  description?: string;
  userRole?: "OWNER" | "ADMIN" | "MEMBER";
}

interface OrganizationState {
  currentOrganization: Organization | null;
  currentVault: { id: string; name: string; organizationId: string } | null;
  setCurrentOrganization: (organization: Organization | null) => void;
  setCurrentVault: (vault: { id: string; name: string; organizationId: string } | null) => void;
  clearVault: () => void;
  clearContext: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      currentOrganization: null,
      currentVault: null,
      setCurrentOrganization: (organization) => set({ currentOrganization: organization }),
      setCurrentVault: (vault) => set({ currentVault: vault }),
      clearVault: () => set({ currentVault: null }),
      clearContext: () => set({ currentOrganization: null, currentVault: null }),
    }),
    {
      name: "organization-storage",
    }
  )
);
