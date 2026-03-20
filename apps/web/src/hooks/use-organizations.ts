import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  organizationService, 
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type InviteUserData,
  type UpdateMemberRoleData,
  type CreateTeamData,
  type UpdateTeamData,
  type AssignTeamRoleData,
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "invitations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-invitations", "mine"] });
      // We let the component handle the toast so it can display the invite link
    },
    onError: (error) => {
      toast.error("Failed to invite user");
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => organizationService.acceptInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-invitations", "mine"] });
      toast.success("Invitation accepted successfully");
    },
    onError: () => {
      toast.error("Failed to accept invitation");
    },
  });
}

export function useMyPendingInvitations(enabled = true) {
  return useQuery({
    queryKey: ["organization-invitations", "mine"],
    queryFn: () => organizationService.getMyPendingInvitations(),
    enabled,
  });
}

export function useOrganizationInvitations(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: ["organizations", organizationId, "invitations"],
    queryFn: () => organizationService.getOrganizationInvitations(organizationId!),
    enabled: enabled && !!organizationId,
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      invitationId,
    }: {
      organizationId: string;
      invitationId: string;
    }) => organizationService.revokeInvitation(organizationId, invitationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "invitations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-invitations", "mine"] });
      toast.success("Invitation revoked");
    },
    onError: () => {
      toast.error("Failed to revoke invitation");
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

export function useTeams(organizationId?: string) {
  return useQuery({
    queryKey: ["organizations", organizationId, "teams"],
    queryFn: () => organizationService.getTeams(organizationId!),
    enabled: !!organizationId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: CreateTeamData }) =>
      organizationService.createTeam(organizationId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      toast.success("Team created successfully");
    },
    onError: () => {
      toast.error("Failed to create team");
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      data,
    }: {
      organizationId: string;
      teamId: string;
      data: UpdateTeamData;
    }) => organizationService.updateTeam(organizationId, teamId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      toast.success("Team updated successfully");
    },
    onError: () => {
      toast.error("Failed to update team");
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, teamId }: { organizationId: string; teamId: string }) =>
      organizationService.deleteTeam(organizationId, teamId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      toast.success("Team deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete team");
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      userId,
    }: {
      organizationId: string;
      teamId: string;
      userId: string;
    }) => organizationService.addTeamMember(organizationId, teamId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      toast.success("Team member added");
    },
    onError: () => {
      toast.error("Failed to add team member");
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      userId,
    }: {
      organizationId: string;
      teamId: string;
      userId: string;
    }) => organizationService.removeTeamMember(organizationId, teamId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      toast.success("Team member removed");
    },
    onError: () => {
      toast.error("Failed to remove team member");
    },
  });
}

export function useAssignTeamRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      data,
    }: {
      organizationId: string;
      teamId: string;
      data: AssignTeamRoleData;
    }) => organizationService.assignTeamRole(organizationId, teamId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      queryClient.invalidateQueries({
        queryKey: ["organizations", variables.organizationId, "teams", variables.teamId, "roles"],
      });
      toast.success("Team role assigned");
    },
    onError: () => {
      toast.error("Failed to assign team role");
    },
  });
}

export function useRemoveTeamRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      roleId,
    }: {
      organizationId: string;
      teamId: string;
      roleId: string;
    }) => organizationService.removeTeamRole(organizationId, teamId, roleId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.organizationId, "teams"] });
      queryClient.invalidateQueries({
        queryKey: ["organizations", variables.organizationId, "teams", variables.teamId, "roles"],
      });
      toast.success("Team role removed");
    },
    onError: () => {
      toast.error("Failed to remove team role");
    },
  });
}

export function useAccessGraph(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: ["organizations", organizationId, "graph"],
    queryFn: () => organizationService.getAccessGraph(organizationId!),
    enabled: enabled && !!organizationId,
  });
}

export function useAccessGraphDetail(
  organizationId?: string,
  nodeType?: string,
  nodeId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["organizations", organizationId, "graph", "detail", nodeType, nodeId],
    queryFn: () => organizationService.getAccessGraphDetail(organizationId!, nodeType!, nodeId!),
    enabled: enabled && !!organizationId && !!nodeType && !!nodeId,
  });
}
