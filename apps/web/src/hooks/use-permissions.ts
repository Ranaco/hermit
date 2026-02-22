import { useAuthStore } from '../store/auth.store';
import { useOrganizationStore } from '../store/organization.store';

export enum Permission {
  // Organization Permissions
  ORG_READ = 'ORG_READ',
  ORG_UPDATE = 'ORG_UPDATE',
  ORG_DELETE = 'ORG_DELETE',
  ORG_INVITE_MEMBER = 'ORG_INVITE_MEMBER',
  ORG_REMOVE_MEMBER = 'ORG_REMOVE_MEMBER',
  ORG_UPDATE_MEMBER_ROLE = 'ORG_UPDATE_MEMBER_ROLE',

  // Vault Permissions
  VAULT_READ = 'VAULT_READ',
  VAULT_CREATE = 'VAULT_CREATE',
  VAULT_UPDATE = 'VAULT_UPDATE',
  VAULT_DELETE = 'VAULT_DELETE',

  // Key Permissions
  KEY_READ = 'KEY_READ',
  KEY_CREATE = 'KEY_CREATE',
  KEY_ROTATE = 'KEY_ROTATE',
  KEY_DELETE = 'KEY_DELETE',

  // Secret Permissions
  SECRET_READ = 'SECRET_READ',
  SECRET_CREATE = 'SECRET_CREATE',
  SECRET_DELETE = 'SECRET_DELETE',
}

export const RolePermissions: Record<string, Permission[]> = {
  MEMBER: [
    Permission.ORG_READ,
    Permission.VAULT_READ,
    Permission.KEY_READ,
    Permission.SECRET_READ,
  ],
  ADMIN: [
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_INVITE_MEMBER,
    Permission.ORG_REMOVE_MEMBER,
    Permission.VAULT_READ,
    Permission.VAULT_CREATE,
    Permission.VAULT_UPDATE,
    Permission.KEY_READ,
    Permission.KEY_CREATE,
    Permission.KEY_ROTATE,
    Permission.SECRET_READ,
    Permission.SECRET_CREATE,
    Permission.SECRET_DELETE,
  ],
  OWNER: [
    ...Object.values(Permission),
  ],
};

export function usePermissions() {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();

  const hasPermission = (permission: Permission) => {
    const role = currentOrganization?.userRole;
    if (!user || !role) return false;
    const permissions = RolePermissions[role] || [];
    return permissions.includes(permission);
  };

  return {
    hasPermission,
    Permission,
  };
}
