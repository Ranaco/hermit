import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  organizationService, 
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type InviteUserData,
  type UpdateMemberRoleData
} from "@/services/organization.service";
import { toast } from "sonner";

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () => organizationService.getAll(),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ["organizations", id],
    queryFn: () => organizationService.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationData) => organizationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully");
    },
    onError: () => {
      toast.error("Failed to create organization");
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationData }) =>
      organizationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated successfully");
    },
    onError: () => {
      toast.error("Failed to update organization");
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete organization");
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: InviteUserData }) =>
      organizationService.inviteUser(organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("User invited successfully");
    },
    onError: () => {
      toast.error("Failed to invite user");
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, userId }: { organizationId: string; userId: string }) =>
      organizationService.removeMember(organizationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Member removed successfully");
    },
    onError: () => {
      toast.error("Failed to remove member");
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      organizationId, 
      userId, 
      data 
    }: { 
      organizationId: string; 
      userId: string; 
      data: UpdateMemberRoleData;
    }) => organizationService.updateMemberRole(organizationId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Member role updated successfully");
    },
    onError: () => {
      toast.error("Failed to update member role");
    },
  });
}
