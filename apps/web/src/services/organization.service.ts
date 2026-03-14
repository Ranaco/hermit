import { apiClient } from "@/lib/api";

export type Role = "OWNER" | "ADMIN" | "MEMBER";

export interface OrganizationMember {
  id: string;
  userId: string;
  roleId: string | null;
  role?: {
    id: string;
    name: string;
    isDefault?: boolean;
    permissions?: string[];
  } | null;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
  members?: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  }[];
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userRole?: Role;
  _count?: {
    members: number;
    vaults: number;
    teams?: number;
  };
  members?: OrganizationMember[];
  teams?: Team[];
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
  roleId?: string;
}

export interface OrganizationInvitation {
  id: string;
  token: string;
  email: string;
  organizationId: string;
  organizationName: string;
  roleId: string | null;
  roleName: string | null;
  invitedBy: {
    id: string;
    email: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface InviteUserResponse {
  invitation?: OrganizationInvitation;
  member?: OrganizationMember;
}

export interface UpdateMemberRoleData {
  roleId: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
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

  update: async (id: string, data: UpdateOrganizationData): Promise<Organization> => {
    const response = await apiClient.patch(`/organizations/${id}`, data);
    return response.data.data.organization;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${id}`);
  },

  inviteUser: async (
    organizationId: string,
    data: InviteUserData,
  ): Promise<InviteUserResponse> => {
    const response = await apiClient.post(
      `/organizations/${organizationId}/invitations`,
      data,
    );
    return response.data.data;
  },

  acceptInvitation: async (token: string): Promise<void> => {
    await apiClient.post("/organizations/invitations/accept", { token });
  },

  getMyPendingInvitations: async (): Promise<OrganizationInvitation[]> => {
    const response = await apiClient.get("/organizations/invitations/mine");
    return response.data.data.invitations;
  },

  getOrganizationInvitations: async (
    organizationId: string,
  ): Promise<OrganizationInvitation[]> => {
    const response = await apiClient.get(`/organizations/${organizationId}/invitations`);
    return response.data.data.invitations;
  },

  revokeInvitation: async (
    organizationId: string,
    invitationId: string,
  ): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/invitations/${invitationId}`);
  },

  removeMember: async (organizationId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
  },

  updateMemberRole: async (
    organizationId: string,
    userId: string,
    data: UpdateMemberRoleData,
  ): Promise<OrganizationMember> => {
    const response = await apiClient.patch(
      `/organizations/${organizationId}/members/${userId}`,
      data,
    );
    return response.data.data.member;
  },

  getTeams: async (organizationId: string): Promise<Team[]> => {
    const response = await apiClient.get(`/organizations/${organizationId}/teams`);
    return response.data.data.teams;
  },

  createTeam: async (organizationId: string, data: CreateTeamData): Promise<Team> => {
    const response = await apiClient.post(`/organizations/${organizationId}/teams`, data);
    return response.data.data.team;
  },

  updateTeam: async (
    organizationId: string,
    teamId: string,
    data: UpdateTeamData,
  ): Promise<Team> => {
    const response = await apiClient.patch(
      `/organizations/${organizationId}/teams/${teamId}`,
      data,
    );
    return response.data.data.team;
  },

  deleteTeam: async (organizationId: string, teamId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/teams/${teamId}`);
  },

  addTeamMember: async (
    organizationId: string,
    teamId: string,
    userId: string,
  ): Promise<void> => {
    await apiClient.post(`/organizations/${organizationId}/teams/${teamId}/members`, { userId });
  },

  removeTeamMember: async (
    organizationId: string,
    teamId: string,
    userId: string,
  ): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/teams/${teamId}/members/${userId}`);
  },
};
