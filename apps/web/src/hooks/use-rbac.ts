import { useOrganizationStore } from "@/store/organization.store";
import { useAuthStore } from "@/store/auth.store";

export type Permission = "VIEW" | "USE" | "EDIT" | "ADMIN";
export type Role = "OWNER" | "ADMIN" | "MEMBER";

export interface RBACPermissions {
  canReadVaults: boolean;
  canCreateVault: boolean;
  canEditVault: boolean;
  canDeleteVault: boolean;
  canReadKeys: boolean;
  canCreateKey: boolean;
  canEditKey: boolean;
  canDeleteKey: boolean;
  canRotateKey: boolean;
  canReadSecrets: boolean;
  canCreateSecret: boolean;
  canEditSecret: boolean;
  canDeleteSecret: boolean;
  canRevealSecret: boolean;
  canManageMembers: boolean;
  canManageOrganization: boolean;
  canEditOrganization: boolean;
  canDeleteOrganization: boolean;
  canInviteMembers: boolean;
  canInviteUsers: boolean;
  canReadInvitations: boolean;
  canCreateInvitations: boolean;
  canRevokeInvitations: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canReadRoles: boolean;
  canManageRoles: boolean;
  canReadPolicies: boolean;
  canCreatePolicies: boolean;
  canEditPolicies: boolean;
  canDeletePolicies: boolean;
  canManageTeams: boolean;
  canAssignTeamRoles: boolean;
}

export function useRBAC(): RBACPermissions {
  const { currentOrganization } = useOrganizationStore();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !currentOrganization) {
    return {
      canReadVaults: false,
      canCreateVault: false,
      canEditVault: false,
      canDeleteVault: false,
      canReadKeys: false,
      canCreateKey: false,
      canEditKey: false,
      canDeleteKey: false,
      canRotateKey: false,
      canReadSecrets: false,
      canCreateSecret: false,
      canEditSecret: false,
      canDeleteSecret: false,
      canRevealSecret: false,
      canManageMembers: false,
      canManageOrganization: false,
      canEditOrganization: false,
      canDeleteOrganization: false,
      canInviteMembers: false,
      canInviteUsers: false,
      canReadInvitations: false,
      canCreateInvitations: false,
      canRevokeInvitations: false,
      canRemoveMembers: false,
      canChangeRoles: false,
      canReadRoles: false,
      canManageRoles: false,
      canReadPolicies: false,
      canCreatePolicies: false,
      canEditPolicies: false,
      canDeletePolicies: false,
      canManageTeams: false,
      canAssignTeamRoles: false,
    };
  }

  const role = currentOrganization.userRole || "MEMBER";
  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN";
  const canManageWorkspace = isOwner || isAdmin;
  const canReadWorkspace = isOwner || isAdmin || role === "MEMBER";

  return {
    canReadVaults: canReadWorkspace,
    canCreateVault: canManageWorkspace,
    canEditVault: canManageWorkspace,
    canDeleteVault: canManageWorkspace,

    canReadKeys: canReadWorkspace,
    canCreateKey: canManageWorkspace,
    canEditKey: canManageWorkspace,
    canDeleteKey: canManageWorkspace,
    canRotateKey: canManageWorkspace,

    canReadSecrets: canReadWorkspace,
    canCreateSecret: canManageWorkspace,
    canEditSecret: canManageWorkspace,
    canDeleteSecret: canManageWorkspace,
    canRevealSecret: canReadWorkspace,

    canManageMembers: canManageWorkspace,
    canManageOrganization: canManageWorkspace,
    canEditOrganization: canManageWorkspace,
    canDeleteOrganization: isOwner,
    canInviteMembers: canManageWorkspace,
    canInviteUsers: canManageWorkspace,
    canReadInvitations: canManageWorkspace,
    canCreateInvitations: canManageWorkspace,
    canRevokeInvitations: canManageWorkspace,
    canRemoveMembers: canManageWorkspace,
    canChangeRoles: canManageWorkspace,
    canReadRoles: canReadWorkspace,
    canManageRoles: isOwner,
    canReadPolicies: isOwner,
    canCreatePolicies: isOwner,
    canEditPolicies: isOwner,
    canDeletePolicies: isOwner,
    canManageTeams: canManageWorkspace,
    canAssignTeamRoles: canManageWorkspace,
  };
}

export function hasPermission(userRole: Role | undefined, required: Permission): boolean {
  if (!userRole) return false;

  const permissionHierarchy = {
    VIEW: ["VIEW", "USE", "EDIT", "ADMIN"],
    USE: ["USE", "EDIT", "ADMIN"],
    EDIT: ["EDIT", "ADMIN"],
    ADMIN: ["ADMIN"],
  };

  const rolePermissions: Record<Role, Permission[]> = {
    OWNER: ["ADMIN"],
    ADMIN: ["ADMIN"],
    MEMBER: ["EDIT"],
  };

  const userPermissions = rolePermissions[userRole] || [];
  const requiredPermissions = permissionHierarchy[required] || [];

  return userPermissions.some((p) => requiredPermissions.includes(p));
}
