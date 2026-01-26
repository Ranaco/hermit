import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (accessToken, refreshToken) => {
        if (accessToken) {
          localStorage.setItem("auth_token", accessToken);
        } else {
          localStorage.removeItem("auth_token");
        }
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        } else {
          localStorage.removeItem("refresh_token");
        }
        set({ accessToken, refreshToken });
      },
      logout: () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
