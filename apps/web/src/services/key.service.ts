import { apiClient } from "@/lib/api";

export interface KeyVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
    username: string;
  };
}

export interface Key {
  id: string;
  name: string;
  description?: string;
  vaultId: string;
  valueType: "STRING" | "JSON" | "NUMBER" | "BOOLEAN" | "MULTILINE";
  createdAt: string;
  updatedAt: string;
  vault: {
    id: string;
    name: string;
  };
  versions?: KeyVersion[];
  _count?: {
    versions: number;
  };
}

export interface CreateKeyData {
  name: string;
  description?: string;
  vaultId: string;
  valueType?: "STRING" | "JSON" | "NUMBER" | "BOOLEAN" | "MULTILINE";
}

export const keyService = {
  getAll: async (vaultId: string): Promise<Key[]> => {
    const response = await apiClient.get("/keys", {
      params: { vaultId },
    });
    return response.data.data.keys;
  },

  getById: async (id: string): Promise<Key> => {
    const response = await apiClient.get(`/keys/${id}`);
    return response.data.data.key;
  },

  create: async (data: CreateKeyData): Promise<Key> => {
    const response = await apiClient.post("/keys", data);
    return response.data.data.key;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/keys/${id}`);
  },

  rotate: async (id: string): Promise<{ versionNumber: number }> => {
    const response = await apiClient.post(`/keys/${id}/rotate`);
    return { versionNumber: response.data.data.versionNumber };
  },

  encrypt: async (
    keyId: string,
    plaintext: string,
  ): Promise<{ ciphertext: string }> => {
    const response = await apiClient.post(`/keys/${keyId}/encrypt`, {
      plaintext,
    });
    return { ciphertext: response.data.data.ciphertext };
  },

  decrypt: async (
    keyId: string,
    ciphertext: string,
  ): Promise<{ plaintext: string }> => {
    const response = await apiClient.post(`/keys/${keyId}/decrypt`, {
      ciphertext,
    });
    return { plaintext: response.data.data.plaintext };
  },

  batchEncrypt: async (
    keyId: string,
    plaintexts: string[],
  ): Promise<{ ciphertexts: string[] }> => {
    const response = await apiClient.post(`/keys/${keyId}/encrypt/batch`, {
      plaintexts,
    });
    return { ciphertexts: response.data.data.ciphertexts };
  },

  batchDecrypt: async (
    keyId: string,
    ciphertexts: string[],
  ): Promise<{ plaintexts: string[] }> => {
    const response = await apiClient.post(`/keys/${keyId}/decrypt/batch`, {
      ciphertexts,
    });
    return { plaintexts: response.data.data.plaintexts };
  },
};
