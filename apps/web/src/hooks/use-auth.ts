import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, type LoginCredentials, type RegisterData } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { useOrganizationStore } from "@/store/organization.store";
import { toast } from "sonner";

export function useLogin() {
  const { setUser, setTokens } = useAuthStore();
  const clearContext = useOrganizationStore((state) => state.clearContext);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      clearContext();
      setUser(data.user);
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      toast.success("Login successful!");
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(message);
    },
  });
}

export function useRegister() {
  const { setUser, setTokens } = useAuthStore();
  const clearContext = useOrganizationStore((state) => state.clearContext);

  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (data) => {
      clearContext();
      setUser(data.user);
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      toast.success("Registration successful!");
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Registration failed. Please try again.";
      toast.error(message);
    },
  });
}

export function useLogout() {
  const { logout, refreshToken } = useAuthStore();
  const clearContext = useOrganizationStore((state) => state.clearContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(refreshToken || ""),
    onSuccess: () => {
      clearContext();
      logout();
      queryClient.clear();
      toast.success("Logged out successfully");
    },
    onError: () => {
      // Even if logout fails on server, clear local state
      clearContext();
      logout();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: authService.getCurrentUser,
    enabled: isAuthenticated,
  });
}
