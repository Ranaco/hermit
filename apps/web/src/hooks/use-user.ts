import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userService, type UpdateProfileData, type ChangePasswordData } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => userService.updateProfile(data),
    onSuccess: (updatedUser) => {
      if (user) {
        setUser({ ...user, ...updatedUser });
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile updated");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update profile.";
      toast.error(message);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => userService.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed. Other sessions have been logged out.");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to change password.";
      toast.error(message);
    },
  });
}
