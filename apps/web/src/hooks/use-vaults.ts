import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  vaultService,
  type CreateVaultData,
  type GrantPermissionData,
  type GrantTeamPermissionData,
} from "@/services/vault.service";
import { toast } from "sonner";

export function useVaults(organizationId?: string) {
  return useQuery({
    queryKey: ["vaults", organizationId],
    queryFn: () => vaultService.getAll(organizationId),
    enabled: !!organizationId, // Only fetch when we have an organization
  });
}

export function useVault(id: string) {
  return useQuery({
    queryKey: ["vaults", id],
    queryFn: () => vaultService.getById(id),
    enabled: !!id,
  });
}

export function useCreateVault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVaultData) => vaultService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Vault created successfully");
    },
    onError: () => {
      toast.error("Failed to create vault");
    },
  });
}

export function useUpdateVault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVaultData> }) =>
      vaultService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Vault updated successfully");
    },
    onError: () => {
      toast.error("Failed to update vault");
    },
  });
}

export function useDeleteVault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vaultService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Vault deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete vault");
    },
  });
}

export function useGrantVaultUserPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vaultId, data }: { vaultId: string; data: GrantPermissionData }) =>
      vaultService.grantPermission(vaultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Vault permission granted");
    },
    onError: () => {
      toast.error("Failed to grant vault permission");
    },
  });
}

export function useRevokeVaultUserPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vaultId, userId }: { vaultId: string; userId: string }) =>
      vaultService.revokePermission(vaultId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Vault permission revoked");
    },
    onError: () => {
      toast.error("Failed to revoke vault permission");
    },
  });
}

export function useGrantVaultTeamPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vaultId, data }: { vaultId: string; data: GrantTeamPermissionData }) =>
      vaultService.grantTeamPermission(vaultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Team vault permission granted");
    },
    onError: () => {
      toast.error("Failed to grant team permission");
    },
  });
}

export function useRevokeVaultTeamPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vaultId, teamId }: { vaultId: string; teamId: string }) =>
      vaultService.revokeTeamPermission(vaultId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success("Team vault permission revoked");
    },
    onError: () => {
      toast.error("Failed to revoke team permission");
    },
  });
}
