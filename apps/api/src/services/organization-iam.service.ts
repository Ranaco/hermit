import type { Prisma } from "@hermit/prisma";
import getPrismaClient from "./prisma.service";

interface PolicyStatement {
  sid?: string;
  effect: "ALLOW" | "DENY";
  actions: string[];
  resources: string[];
}

interface PolicyDocument {
  version: string;
  statements: PolicyStatement[];
}

type PolicyJsonDocument = Prisma.InputJsonObject;

const MANAGED_POLICY_NAMES = {
  OWNER: "Managed Owner Access",
  ADMIN: "Managed Admin Access",
  MEMBER: "Managed Member Access",
} as const;

function orgUrn(orgId: string): string {
  return `urn:hermit:org:${orgId}`;
}

function vaultWildcardUrn(orgId: string): string {
  return `${orgUrn(orgId)}:vault:*`;
}

function keyWildcardUrn(orgId: string): string {
  return `${vaultWildcardUrn(orgId)}:key:*`;
}

function secretWildcardUrn(orgId: string): string {
  return `${vaultWildcardUrn(orgId)}:secret:*`;
}

function groupWildcardUrn(orgId: string): string {
  return `${vaultWildcardUrn(orgId)}:group:*`;
}

function memberWildcardUrn(orgId: string): string {
  return `${orgUrn(orgId)}:member:*`;
}

function teamWildcardUrn(orgId: string): string {
  return `${orgUrn(orgId)}:team:*`;
}

function roleWildcardUrn(orgId: string): string {
  return `${orgUrn(orgId)}:role:*`;
}

function policyWildcardUrn(orgId: string): string {
  return `${orgUrn(orgId)}:policy:*`;
}

function invitationWildcardUrn(orgId: string): string {
  return `${orgUrn(orgId)}:invitation:*`;
}

function buildManagedPolicies(orgId: string): Record<string, PolicyDocument> {
  return {
    [MANAGED_POLICY_NAMES.OWNER]: {
      version: "2026-03-14",
      statements: [
        {
          sid: "OwnerFullAccess",
          effect: "ALLOW",
          actions: ["*"],
          resources: ["*"],
        },
      ],
    },
    [MANAGED_POLICY_NAMES.ADMIN]: {
      version: "2026-03-14",
      statements: [
        {
          sid: "OrganizationAdministration",
          effect: "ALLOW",
          actions: [
            "organizations:read",
            "organizations:update",
            "organizations:members:read",
            "organizations:invitations:read",
            "organizations:invitations:create",
            "organizations:invitations:revoke",
          ],
          resources: [orgUrn(orgId), memberWildcardUrn(orgId), invitationWildcardUrn(orgId)],
        },
        {
          sid: "TeamAdministration",
          effect: "ALLOW",
          actions: [
            "teams:read",
            "teams:create",
            "teams:update",
            "teams:delete",
            "teams:members:update",
          ],
          resources: [teamWildcardUrn(orgId)],
        },
        {
          sid: "RoleReadAndAssignment",
          effect: "ALLOW",
          actions: ["roles:read", "roles:assign"],
          resources: [roleWildcardUrn(orgId), memberWildcardUrn(orgId), teamWildcardUrn(orgId)],
        },
        {
          sid: "VaultManagement",
          effect: "ALLOW",
          actions: ["vaults:create", "vaults:read", "vaults:update", "vaults:delete"],
          resources: [vaultWildcardUrn(orgId)],
        },
        {
          sid: "GroupManagement",
          effect: "ALLOW",
          actions: ["groups:create", "groups:read", "groups:update", "groups:delete"],
          resources: [groupWildcardUrn(orgId)],
        },
        {
          sid: "KeyManagement",
          effect: "ALLOW",
          actions: ["keys:create", "keys:read", "keys:update", "keys:delete", "keys:use"],
          resources: [keyWildcardUrn(orgId)],
        },
        {
          sid: "SecretManagement",
          effect: "ALLOW",
          actions: ["secrets:create", "secrets:read", "secrets:update", "secrets:delete", "secrets:use"],
          resources: [secretWildcardUrn(orgId)],
        },
      ],
    },
    [MANAGED_POLICY_NAMES.MEMBER]: {
      version: "2026-03-14",
      statements: [
        {
          sid: "OrganizationRead",
          effect: "ALLOW",
          actions: ["organizations:read", "organizations:members:read", "teams:read", "roles:read"],
          resources: [orgUrn(orgId), memberWildcardUrn(orgId), teamWildcardUrn(orgId), roleWildcardUrn(orgId)],
        },
        {
          sid: "VaultRead",
          effect: "ALLOW",
          actions: ["vaults:read", "groups:read"],
          resources: [vaultWildcardUrn(orgId), groupWildcardUrn(orgId)],
        },
        {
          sid: "KeyUse",
          effect: "ALLOW",
          actions: ["keys:read", "keys:use"],
          resources: [keyWildcardUrn(orgId)],
        },
        {
          sid: "SecretUse",
          effect: "ALLOW",
          actions: ["secrets:read", "secrets:use"],
          resources: [secretWildcardUrn(orgId)],
        },
      ],
    },
  };
}

function toPolicyJson(document: PolicyDocument): PolicyJsonDocument {
  return document as unknown as PolicyJsonDocument;
}

export async function ensureOrganizationIamBootstrap(orgId: string): Promise<void> {
  const prisma = getPrismaClient();
  const roles = await prisma.organizationRole.findMany({
    where: {
      organizationId: orgId,
      name: { in: ["OWNER", "ADMIN", "MEMBER"] },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (roles.length === 0) {
    return;
  }

  const policies = buildManagedPolicies(orgId);

  for (const role of roles) {
    const policyName =
      role.name === "OWNER"
        ? MANAGED_POLICY_NAMES.OWNER
        : role.name === "ADMIN"
          ? MANAGED_POLICY_NAMES.ADMIN
          : MANAGED_POLICY_NAMES.MEMBER;

    const policy = await prisma.policy.upsert({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: policyName,
        },
      },
      update: {
        description: `${role.name} baseline IAM policy`,
        document: toPolicyJson(policies[policyName]),
        isManaged: true,
      },
      create: {
        organizationId: orgId,
        name: policyName,
        description: `${role.name} baseline IAM policy`,
        document: toPolicyJson(policies[policyName]),
        isManaged: true,
      },
      select: {
        id: true,
      },
    });

    await prisma.rolePolicyAttachment.upsert({
      where: {
        roleId_policyId: {
          roleId: role.id,
          policyId: policy.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        policyId: policy.id,
      },
    });
  }
}

export function buildOrganizationUrn(orgId: string): string {
  return orgUrn(orgId);
}

export function buildTeamUrn(orgId: string, teamId: string): string {
  return `${orgUrn(orgId)}:team:${teamId}`;
}

export function buildMemberUrn(orgId: string, memberId: string): string {
  return `${orgUrn(orgId)}:member:${memberId}`;
}

export function buildRoleUrn(orgId: string, roleId: string): string {
  return `${orgUrn(orgId)}:role:${roleId}`;
}

export function buildPolicyUrn(orgId: string, policyId: string): string {
  return `${orgUrn(orgId)}:policy:${policyId}`;
}

export function buildInvitationUrn(orgId: string, invitationId: string): string {
  return `${orgUrn(orgId)}:invitation:${invitationId}`;
}
