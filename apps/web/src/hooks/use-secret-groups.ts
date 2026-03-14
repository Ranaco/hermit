import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { secretGroupService, type CreateSecretGroupData, type UpdateSecretGroupData } from "@/services/secret-group.service";
import { toast } from "sonner";

export function useSecretGroups(
  vaultId?: string,
  parentId?: string,
  includeChildren = false,
  forPolicyBuilder = false,
) {
  return useQuery({
    queryKey: ["secret-groups", vaultId, parentId, includeChildren, forPolicyBuilder],
    queryFn: () => secretGroupService.getAll(vaultId!, parentId, includeChildren, forPolicyBuilder),
    enabled: !!vaultId,
  });
}

export function useCreateSecretGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, data }: { vaultId: string; data: CreateSecretGroupData }) =>
      secretGroupService.create(vaultId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["secret-groups", variables.vaultId] });
      toast.success("Folder created successfully");
    },
    onError: () => {
      toast.error("Failed to create folder");
    },
  });
}

export function useUpdateSecretGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, groupId, data }: { vaultId: string; groupId: string; data: UpdateSecretGroupData }) =>
      secretGroupService.update(vaultId, groupId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["secret-groups", variables.vaultId] });
      toast.success("Folder updated successfully");
    },
    onError: () => {
      toast.error("Failed to update folder");
    },
  });
}

export function useDeleteSecretGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, groupId }: { vaultId: string; groupId: string }) =>
      secretGroupService.delete(vaultId, groupId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["secret-groups", variables.vaultId] });
      toast.success("Folder deleted successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete folder. It may not be empty.";
      toast.error(message);
    },
  });
}
