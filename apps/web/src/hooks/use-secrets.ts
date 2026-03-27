import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { secretService, type CreateSecretData, type UpdateSecretData, type RevealSecretData } from "@/services/secret.service";
import { toast } from "sonner";

export function useSecrets(vaultId?: string, groupId?: string) {
  return useQuery({
    queryKey: ["secrets", vaultId, groupId],
    queryFn: () => secretService.getAll(vaultId!, groupId),
    enabled: !!vaultId,
  });
}

export function useRevealSecret(id: string) {
  return useMutation({
    mutationFn: (data?: RevealSecretData) => secretService.reveal(id, data),
    onSuccess: (result) => {
      if (result.requiresPassword) {
        return;
      }
      toast.success("Secret revealed successfully");
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to reveal secret";
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        errorMessage = response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    },
  });
}

export function useSecret(id?: string) {
  return useQuery({
    queryKey: ["secrets", id, "detail"],
    queryFn: () => secretService.getById(id!),
    enabled: !!id,
  });
}

export function useSecretVersions(id: string) {
  return useQuery({
    queryKey: ["secrets", id, "versions"],
    queryFn: () => secretService.getVersions(id),
    enabled: !!id,
  });
}

export function useCreateSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSecretData) => secretService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      toast.success("Secret created successfully");
    },
    onError: () => {
      toast.error("Failed to create secret");
    },
  });
}

export function useUpdateSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSecretData }) =>
      secretService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      queryClient.invalidateQueries({ queryKey: ["secrets", variables.id, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["secrets", variables.id, "versions"] });
      toast.success("Secret updated successfully");
    },
    onError: () => {
      toast.error("Failed to update secret");
    },
  });
}

export function useDeleteSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => secretService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      toast.success("Secret deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete secret");
    },
  });
}

export function useSetCurrentSecretVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
      secretService.setCurrentVersion(id, versionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      queryClient.invalidateQueries({ queryKey: ["secrets", variables.id, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["secrets", variables.id, "versions"] });
      toast.success("Current version updated");
    },
    onError: () => {
      toast.error("Failed to update current version");
    },
  });
}
