import { apiClient } from "@/lib/api";

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const userService = {
  updateProfile: async (data: UpdateProfileData) => {
    const response = await apiClient.patch("/users/me", data);
    return response.data.data.user;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await apiClient.post("/users/me/password", data);
    return response.data;
  },
};
