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

  _count?: {
    keys: number;
  };
}

export interface CreateVaultData {
  name: string;
  description?: string;
  organizationId: string;
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


};
