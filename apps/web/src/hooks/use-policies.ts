import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { policyService, type CreatePolicyData, type CreateRoleData } from "@/services/policy.service";
import { toast } from "sonner";
import { useOrganizationStore } from "@/store/organization.store";

export function usePolicies() {
  const { currentOrganization } = useOrganizationStore();
  
  return useQuery({
    queryKey: ["policies", currentOrganization?.id],
    queryFn: () => policyService.getPolicies(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationStore();

  return useMutation({
    mutationFn: (data: CreatePolicyData) => policyService.createPolicy(currentOrganization!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", currentOrganization?.id] });
      toast.success("Policy created successfully");
    },
    onError: () => {
      toast.error("Failed to create policy");
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationStore();

  return useMutation({
    mutationFn: ({ policyId, data }: { policyId: string; data: CreatePolicyData }) => 
      policyService.updatePolicy(currentOrganization!.id, policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", currentOrganization?.id] });
      toast.success("Policy updated successfully");
    },
    onError: () => {
      toast.error("Failed to update policy");
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationStore();

  return useMutation({
    mutationFn: (policyId: string) => policyService.deletePolicy(currentOrganization!.id, policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", currentOrganization?.id] });
      toast.success("Policy deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete policy");
    },
  });
}

export function useRoles() {
  const { currentOrganization } = useOrganizationStore();
  
  return useQuery({
    queryKey: ["roles", currentOrganization?.id],
    queryFn: () => policyService.getRoles(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationStore();

  return useMutation({
    mutationFn: (data: CreateRoleData) => policyService.createRole(currentOrganization!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", currentOrganization?.id] });
      toast.success("Role created successfully");
    },
    onError: () => {
      toast.error("Failed to create role");
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationStore();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: CreateRoleData }) => 
      policyService.updateRole(currentOrganization!.id, roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", currentOrganization?.id] });
      toast.success("Role updated successfully");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });
}

