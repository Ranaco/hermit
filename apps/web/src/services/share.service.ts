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

export const shareService = {
  createShare: async (payload: CreateSharePayload) => {
    const { data } = await apiClient.post("/shares", payload);
    return data;
  },
  
  getShareMetadata: async (token: string) => {
    const { data } = await apiClient.get(`/shares/${token}`);
    return data;
  },
  
  consumeShare: async (token: string, passphrase?: string) => {
    const { data } = await apiClient.post(`/shares/${token}/consume`, { passphrase });
    return data;
  }
};
