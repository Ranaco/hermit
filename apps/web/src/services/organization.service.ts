import { apiClient } from "@/lib/api";

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userRole?: "OWNER" | "ADMIN" | "MEMBER";
  _count?: {
    members: number;
    vaults: number;
  };
  members?: {
    id: string;
    userId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    user: {
      id: string;
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  }[];
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
}

export interface InviteUserData {
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export interface UpdateMemberRoleData {
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export const organizationService = {
  getAll: async (): Promise<Organization[]> => {
    const response = await apiClient.get("/organizations");
    return response.data.data.organizations;
  },

  getById: async (id: string): Promise<Organization> => {
    const response = await apiClient.get(`/organizations/${id}`);
    return response.data.data.organization;
  },

  create: async (data: CreateOrganizationData): Promise<Organization> => {
    const response = await apiClient.post("/organizations", data);
    return response.data.data.organization;
  },

  update: async (
    id: string,
    data: UpdateOrganizationData,
  ): Promise<Organization> => {
    const response = await apiClient.put(`/organizations/${id}`, data);
    return response.data.data.organization;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${id}`);
  },

  inviteUser: async (
    organizationId: string,
    data: InviteUserData,
  ): Promise<void> => {
    await apiClient.post(`/organizations/${organizationId}/invite`, data);
  },

  removeMember: async (
    organizationId: string,
    userId: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/organizations/${organizationId}/members/${userId}`,
    );
  },

  updateMemberRole: async (
    organizationId: string,
    userId: string,
    data: UpdateMemberRoleData,
  ): Promise<void> => {
    await apiClient.put(
      `/organizations/${organizationId}/members/${userId}/role`,
      data,
    );
  },
};
