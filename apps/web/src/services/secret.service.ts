import { apiClient } from "@/lib/api";

export interface Secret {
  id: string;
  name: string;
  description?: string;
  value?: string; // Only present when revealed
  metadata?: Record<string, unknown>;
  tags?: string[];
  vaultId: string;
  keyId: string;
  hasPassword?: boolean;
  passwordHash?: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  accessCount?: number;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
  valueType: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
  vault?: {
    id: string;
    name: string;
  };
  key?: {
    id: string;
    name: string;
  };
  currentVersion?: {
    versionNumber: number;
    createdAt: string;
  };
  _count?: {
    versions: number;
  };
}

export interface SecretVersion {
  id: string;
  versionNumber: number;
  commitMessage?: string;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateSecretData {
  name: string;
  description?: string;
  value: string;
  valueType?: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
  vaultId: string;
  secretGroupId?: string;
  keyId: string;
  password?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  expiresAt?: string;
}

export interface UpdateSecretData {
  value?: string;
  valueType?: 'STRING' | 'JSON' | 'NUMBER' | 'BOOLEAN' | 'MULTILINE';
  description?: string;
  password?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  expiresAt?: string;
  commitMessage?: string;
}

export interface RevealSecretData {
  password?: string;
  vaultPassword?: string;
  versionNumber?: number;
}

export interface RevealSecretResponse {
  secret?: Secret;
  requiresPassword?: "secret" | "vault";
  error?: {
    code: string;
    message: string;
  };
}

export interface PermissionBinding {
  id: string;
  userId?: string;
  teamId?: string;
  permissionLevel: 'VIEW' | 'USE' | 'EDIT' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null; };
  team?: { id: string; name: string; description: string | null; };
}

export const secretService = {
  getAll: async (
    vaultId: string,
    secretGroupId?: string,
  ): Promise<{ secrets: Secret[]; count: number }> => {
    const response = await apiClient.get("/secrets", {
      params: { vaultId, secretGroupId },
    });
    return response.data.data;
  },

  reveal: async (
    id: string,
    data?: RevealSecretData,
  ): Promise<RevealSecretResponse> => {
    try {
      const response = await apiClient.post(`/secrets/${id}/reveal`, data || {});
      return response.data.data;
    } catch (error: unknown) {
      const payload =
        typeof error === "object" &&
        error !== null &&
        "response" in error
          ? (error as { response?: { data?: { requiresPassword?: "secret" | "vault"; error?: { code: string; message: string } } } }).response?.data
          : undefined;
      if (payload?.requiresPassword) {
        return {
          requiresPassword: payload.requiresPassword,
          error: payload.error,
        };
      }
      throw error;
    }
  },

  create: async (data: CreateSecretData): Promise<Secret> => {
    const response = await apiClient.post("/secrets", data);
    return response.data.data.secret;
  },

  update: async (id: string, data: UpdateSecretData): Promise<Secret> => {
    const response = await apiClient.put(`/secrets/${id}`, data);
    return response.data.data.secret;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/secrets/${id}`);
  },

  getVersions: async (
    id: string,
  ): Promise<{ versions: SecretVersion[]; count: number }> => {
    const response = await apiClient.get(`/secrets/${id}/versions`);
    return response.data.data;
  },


};
