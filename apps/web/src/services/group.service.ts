import { apiClient } from "@/lib/api";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  vaultId: string;
  parentId: string | null;
  path: string;
  depth: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    secrets: number;
    children: number;
  };
}

export interface CreateGroupData {
  name: string;
  description?: string;
  vaultId: string;
  parentId?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
}


class GroupService {
  async getAll(
    vaultId: string,
    parentId?: string,
    includeChildren?: boolean,
    forPolicyBuilder?: boolean,
  ): Promise<{ success: boolean; data: Group[] }> {
    const params = new URLSearchParams({ vaultId });
    if (parentId) {
      params.append("parentId", parentId);
    }
    if (includeChildren) {
      params.append("includeChildren", "true");
    }
    if (forPolicyBuilder) {
      params.append("forPolicyBuilder", "true");
    }
    const { data } = await apiClient.get(`/vaults/${vaultId}/groups?${params.toString()}`);
    return data;
  }

  async create(vaultId: string, data: CreateGroupData): Promise<{ success: boolean; data: Group }> {
    const { data: response } = await apiClient.post(`/vaults/${vaultId}/groups`, data);
    return response;
  }

  async update(vaultId: string, groupId: string, data: UpdateGroupData): Promise<{ success: boolean; data: Group }> {
    const { data: response } = await apiClient.put(`/vaults/${vaultId}/groups/${groupId}`, data);
    return response;
  }

  async delete(vaultId: string, groupId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete(`/vaults/${vaultId}/groups/${groupId}`);
    return data;
  }

}

export const groupService = new GroupService();
