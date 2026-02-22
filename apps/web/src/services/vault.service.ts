import { apiClient } from "@/lib/api";

export interface Vault {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
  };
  permissions?: VaultBinding[];
  _count?: {
    keys: number;
  };
}

export interface CreateVaultData {
  name: string;
  description?: string;
  organizationId: string;
}

export interface VaultBinding {
  id: string;
  userId?: string;
  teamId?: string;
  vaultId: string;
  permissionLevel: "VIEW" | "USE" | "EDIT" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface GrantPermissionData {
  userId: string;
  permissionLevel: "VIEW" | "USE" | "EDIT" | "ADMIN";
}

export interface GrantTeamPermissionData {
  teamId: string;
  permissionLevel: "VIEW" | "USE" | "EDIT" | "ADMIN";
}

export const vaultService = {
  getAll: async (organizationId?: string): Promise<Vault[]> => {
    const response = await apiClient.get("/vaults", {
      params: organizationId ? { organizationId } : undefined,
    });
    return response.data.data.vaults;
  },

  getById: async (id: string): Promise<Vault> => {
    const response = await apiClient.get(`/vaults/${id}`);
    return response.data.data.vault;
  },

  create: async (data: CreateVaultData): Promise<Vault> => {
    const response = await apiClient.post("/vaults", data);
    return response.data.data.vault;
  },

  update: async (
    id: string,
    data: Partial<CreateVaultData>,
  ): Promise<Vault> => {
    const response = await apiClient.patch(`/vaults/${id}`, data);
    return response.data.data.vault;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vaults/${id}`);
  },

  grantPermission: async (
    vaultId: string,
    data: GrantPermissionData,
  ): Promise<VaultBinding> => {
    const response = await apiClient.post(
      `/vaults/${vaultId}/permissions/users`,
      data,
    );
    return response.data.data.permission;
  },

  revokePermission: async (vaultId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/vaults/${vaultId}/permissions/users/${userId}`);
  },

  grantTeamPermission: async (
    vaultId: string,
    data: GrantTeamPermissionData,
  ): Promise<VaultBinding> => {
    const response = await apiClient.post(
      `/vaults/${vaultId}/permissions/teams`,
      data,
    );
    return response.data.data.permission;
  },

  revokeTeamPermission: async (vaultId: string, teamId: string): Promise<void> => {
    await apiClient.delete(`/vaults/${vaultId}/permissions/teams/${teamId}`);
  },
};
