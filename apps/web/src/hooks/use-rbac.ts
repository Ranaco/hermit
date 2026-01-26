import { useOrganizationStore } from "@/store/organization.store";
import { useAuthStore } from "@/store/auth.store";

export type Permission = "VIEW" | "USE" | "EDIT" | "ADMIN";
export type Role = "OWNER" | "ADMIN" | "MEMBER";

export interface RBACPermissions {
  canCreateVault: boolean;
  canEditVault: boolean;
  canDeleteVault: boolean;
  canCreateKey: boolean;
  canEditKey: boolean;
  canDeleteKey: boolean;
  canRotateKey: boolean;
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
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canManageRoles: boolean;
}

export function useRBAC(): RBACPermissions {
  const { currentOrganization } = useOrganizationStore();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !currentOrganization) {
    return {
      canCreateVault: false,
      canEditVault: false,
      canDeleteVault: false,
      canCreateKey: false,
      canEditKey: false,
      canDeleteKey: false,
      canRotateKey: false,
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
      canRemoveMembers: false,
      canChangeRoles: false,
      canManageRoles: false,
    };
  }

  const role = currentOrganization.userRole || "MEMBER";

  return {
    // Vault permissions
    canCreateVault: ["OWNER", "ADMIN", "MEMBER"].includes(role),
    canEditVault: ["OWNER", "ADMIN", "MEMBER"].includes(role),
    canDeleteVault: ["OWNER", "ADMIN"].includes(role),

    // Key permissions
    canCreateKey: ["OWNER", "ADMIN", "MEMBER"].includes(role),
    canEditKey: ["OWNER", "ADMIN", "MEMBER"].includes(role),
    canDeleteKey: ["OWNER", "ADMIN"].includes(role),
    canRotateKey: ["OWNER", "ADMIN", "MEMBER"].includes(role),

    // Secret permissions
    canCreateSecret: ["OWNER", "ADMIN", "MEMBER"].includes(role),
    canEditSecret: ["OWNER", "ADMIN", "MEMBER"].includes(role),
    canDeleteSecret: ["OWNER", "ADMIN"].includes(role),
    canRevealSecret: ["OWNER", "ADMIN", "MEMBER"].includes(role),

    // Organization permissions
    canManageMembers: ["OWNER", "ADMIN"].includes(role),
    canManageOrganization: ["OWNER", "ADMIN"].includes(role),
    canEditOrganization: ["OWNER", "ADMIN"].includes(role),
    canDeleteOrganization: role === "OWNER",
    canInviteMembers: ["OWNER", "ADMIN"].includes(role),
    canInviteUsers: ["OWNER", "ADMIN"].includes(role),
    canRemoveMembers: ["OWNER", "ADMIN"].includes(role),
    canChangeRoles: role === "OWNER",
    canManageRoles: role === "OWNER",
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
