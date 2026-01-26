import { apiClient } from "@/lib/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  organization?: {
    id: string;
    name: string;
  } | null;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data.data; // Extract data from { success, data, message }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/register", data);
    return response.data.data; // Extract data from { success, data, message }
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken });
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get("/users/me");
    return response.data.data.user;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data.data.tokens;
  },
};
