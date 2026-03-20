import getPrismaClient from "./prisma.service";
import { ensureOrganizationIamBootstrap } from "./organization-iam.service";

export interface PolicyStatement {
  sid?: string;
  effect: "ALLOW" | "DENY";
  actions: string[];
  resources: string[];
}

export interface PolicyDocument {
  version: string;
  statements: PolicyStatement[];
}

export interface PolicyStatementSource {
  statement: PolicyStatement;
  policyId: string;
  policyName: string;
  roleId: string;
  roleName: string;
  sourceType: "member-role" | "team-role";
  teamId?: string;
  teamName?: string;
}

/**
 * Helper to match an action or resource string against a pattern that may contain a wildcard `*`.
 * e.g., matchURN("urn:hermit:org:123:vault:*", "urn:hermit:org:123:vault:456:secret:789") -> true
 */
export function isMatch(pattern: string, target: string): boolean {
  if (pattern === target) return true;
  if (pattern === "*") return true;

  if (pattern.includes("*")) {
    const regexPattern = "^" + pattern.replace(/\*/g, ".*") + "$";
    const regex = new RegExp(regexPattern);
    return regex.test(target);
  }

  return false;
}

export function explainPolicySourcesAgainstAny(
  sources: PolicyStatementSource[],
  actions: string[],
  resourceUrns: string[],
) {
  const candidateResources = resourceUrns.length > 0 ? resourceUrns : ["*"];

  return actions.map((action) => {
    const matched = sources.filter(({ statement }) => {
      const matchesAction = statement.actions.some((pattern) => isMatch(pattern, action));
      const matchesResource = statement.resources.some((pattern) =>
        candidateResources.some((resourceUrn) => isMatch(pattern, resourceUrn)),
      );
      return matchesAction && matchesResource;
    });

    const denied = matched.filter(({ statement }) => statement.effect === "DENY");
    const allowed = matched.filter(({ statement }) => statement.effect === "ALLOW");

    return {
      action,
      allowed: denied.length === 0 && allowed.length > 0,
      denied: denied.length > 0,
      matches: matched,
    };
  });
}

export function evaluateStatements(
  statements: PolicyStatement[],
  action: string,
  resourceUrn: string,
): boolean {
  return evaluateStatementsAgainstAny(statements, action, [resourceUrn]);
}

export function evaluateStatementsAgainstAny(
  statements: PolicyStatement[],
  action: string,
  resourceUrns: string[],
): boolean {
  let isAllowed = false;
  const candidateResources = resourceUrns.length > 0 ? resourceUrns : ["*"];

  for (const statement of statements) {
    const matchesAction = statement.actions.some((pattern) => isMatch(pattern, action));
    const matchesResource = statement.resources.some((pattern) =>
      candidateResources.some((resourceUrn) => isMatch(pattern, resourceUrn)),
    );

    if (matchesAction && matchesResource) {
      if (statement.effect === "DENY") {
        return false;
      }

      if (statement.effect === "ALLOW") {
        isAllowed = true;
      }
    }
  }

  return isAllowed;
}

/**
 * Compiles and merges all policies attached to a user directly via OrgnizationRoles
 * and indirectly via Team assignments, returning the combined Statements.
 */
export async function getUserPolicies(userId: string, orgId: string): Promise<PolicyStatement[]> {
  const sources = await getUserPolicySources(userId, orgId);
  return sources.map((source) => source.statement);
}

export async function getUserPolicySources(userId: string, orgId: string): Promise<PolicyStatementSource[]> {
  const prisma = getPrismaClient();
  await ensureOrganizationIamBootstrap(orgId);

  // 1. Get the user's direct organization role
  const orgMembership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    include: {
      role: {
        include: {
          policyAttachments: {
            include: { policy: true },
          },
        },
      },
    },
  });

  // 2. Get the user's team memberships and their roles
  const teamMemberships = await prisma.teamMember.findMany({
    where: { userId, team: { organizationId: orgId } },
    include: {
      team: {
        include: {
          roleAssignments: {
            include: {
              role: {
                include: {
                  policyAttachments: {
                    include: { policy: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const statements: PolicyStatementSource[] = [];

  // Parse direct role policies
  if (orgMembership?.role) {
    for (const attachment of orgMembership.role.policyAttachments) {
      const doc = attachment.policy.document as unknown as PolicyDocument;
      if (doc?.statements) {
        statements.push(
          ...doc.statements.map((statement) => ({
            statement,
            policyId: attachment.policy.id,
            policyName: attachment.policy.name,
            roleId: orgMembership.role!.id,
            roleName: orgMembership.role!.name,
            sourceType: "member-role" as const,
          })),
        );
      }
    }
  }

  // Parse team role policies
  for (const tm of teamMemberships) {
    for (const assignment of tm.team.roleAssignments) {
      for (const attachment of assignment.role.policyAttachments) {
        const doc = attachment.policy.document as unknown as PolicyDocument;
        if (doc?.statements) {
          statements.push(
            ...doc.statements.map((statement) => ({
              statement,
              policyId: attachment.policy.id,
              policyName: attachment.policy.name,
              roleId: assignment.role.id,
              roleName: assignment.role.name,
              sourceType: "team-role" as const,
              teamId: tm.team.id,
              teamName: tm.team.name,
            })),
          );
        }
      }
    }
  }

  return statements;
}

/**
 * Core Policy Engine: Evaluates a user's access to a specific resource for a specific action
 * based on all their attached JSON IAM Policies.
 *
 * Evaluation Rules:
 * 1. Explicit DENY overrides ALL.
 * 2. Explicit ALLOW grants access (if no DENY matches).
 * 3. Default (no match) is DENY.
 */
export async function evaluateAccess(
  userId: string,
  orgId: string,
  action: string,
  resourceUrn: string
): Promise<boolean> {
  return evaluateAccessAgainstAny(userId, orgId, action, [resourceUrn]);
}

export async function evaluateAccessAgainstAny(
  userId: string,
  orgId: string,
  action: string,
  resourceUrns: string[],
): Promise<boolean> {
  // Always grant Owners implicit universal access for safety
  const prisma = getPrismaClient();
  const orgMembership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    include: { role: true },
  });

  if (orgMembership?.role?.name === "OWNER") {
    return true; // Root user override
  }

  const statements = await getUserPolicies(userId, orgId);
  return evaluateStatementsAgainstAny(statements, action, resourceUrns);
}
