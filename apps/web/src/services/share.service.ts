import { apiClient } from "@/lib/api";

export interface CreateSharePayload {
  keyId: string;
  value?: string;
  secretId?: string;
  passphrase?: string;
  expiresInHours?: number;
  note?: string;
  audienceEmail?: string;
}

export interface ShareRecord {
  id: string;
}

export interface CreateShareResponse {
  share: ShareRecord;
  token: string;
}

export interface ShareMetadataResponse {
  status: "active" | "expired" | "consumed";
  metadata?: {
    expiresAt?: string;
    requirePassphrase?: boolean;
    note?: string;
  };
}

export interface ConsumeShareResponse {
  value: string;
}

export const shareService = {
  createShare: async (payload: CreateSharePayload): Promise<CreateShareResponse> => {
    const { data } = await apiClient.post("/shares", payload);
    return data.data;
  },
  
  getShareMetadata: async (token: string): Promise<ShareMetadataResponse> => {
    const { data } = await apiClient.get(`/shares/${token}`);
    return data.data;
  },
  
  consumeShare: async (
    token: string,
    passphrase?: string,
  ): Promise<ConsumeShareResponse> => {
    const { data } = await apiClient.post(`/shares/${token}/consume`, { passphrase });
    return data.data;
  },
};
