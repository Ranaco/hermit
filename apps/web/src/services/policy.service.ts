import { apiClient } from "@/lib/api";

export interface PolicyStatement {
  effect: "ALLOW" | "DENY";
  actions: string[];
  resources: string[];
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  statements: PolicyStatement[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRole {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  policyAttachments: {
    policy: Policy;
  }[];
}

export interface CreatePolicyData {
  name: string;
  description?: string;
  statements: PolicyStatement[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
  policyIds: string[];
}

export const policyService = {
  getPolicies: async (orgId: string): Promise<Policy[]> => {
    const response = await apiClient.get(`/organizations/${orgId}/policies`);
    return response.data.data.policies;
  },

  createPolicy: async (orgId: string, data: CreatePolicyData): Promise<Policy> => {
    const response = await apiClient.post(`/organizations/${orgId}/policies`, data);
    return response.data.data.policy;
  },

  getRoles: async (orgId: string): Promise<OrganizationRole[]> => {
    const response = await apiClient.get(`/organizations/${orgId}/roles`);
    return response.data.data.roles;
  },

  createRole: async (orgId: string, data: CreateRoleData): Promise<OrganizationRole> => {
    const response = await apiClient.post(`/organizations/${orgId}/roles`, data);
    return response.data.data.role;
  },

  updateRole: async (orgId: string, roleId: string, data: CreateRoleData): Promise<OrganizationRole> => {
    const response = await apiClient.put(`/organizations/${orgId}/roles/${roleId}`, data);
    return response.data.data.role;
  }
};
