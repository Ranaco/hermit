import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { groupService, type CreateGroupData, type UpdateGroupData } from "@/services/group.service";
import { toast } from "sonner";

export function useGroups(
  vaultId?: string,
  parentId?: string,
  includeChildren = false,
  forPolicyBuilder = false,
) {
  return useQuery({
    queryKey: ["groups", vaultId, parentId, includeChildren, forPolicyBuilder],
    queryFn: () => groupService.getAll(vaultId!, parentId, includeChildren, forPolicyBuilder),
    enabled: !!vaultId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, data }: { vaultId: string; data: CreateGroupData }) =>
      groupService.create(vaultId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups", variables.vaultId] });
      toast.success("Folder created successfully");
    },
    onError: () => {
      toast.error("Failed to create folder");
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, groupId, data }: { vaultId: string; groupId: string; data: UpdateGroupData }) =>
      groupService.update(vaultId, groupId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups", variables.vaultId] });
      toast.success("Folder updated successfully");
    },
    onError: () => {
      toast.error("Failed to update folder");
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, groupId }: { vaultId: string; groupId: string }) =>
      groupService.delete(vaultId, groupId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups", variables.vaultId] });
      toast.success("Folder deleted successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete folder. It may not be empty.";
      toast.error(message);
    },
  });
}
