import getPrismaClient from "./prisma.service";

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

/**
 * Helper to match an action or resource string against a pattern that may contain a wildcard `*`.
 * e.g., matchURN("urn:hermes:org:123:vault:*", "urn:hermes:org:123:vault:456:secret:789") -> true
 */
function isMatch(pattern: string, target: string): boolean {
  if (pattern === target) return true;
  if (pattern === "*") return true;

  if (pattern.includes("*")) {
    const regexPattern = "^" + pattern.replace(/\*/g, ".*") + "$";
    const regex = new RegExp(regexPattern);
    return regex.test(target);
  }

  return false;
}

/**
 * Compiles and merges all policies attached to a user directly via OrgnizationRoles
 * and indirectly via Team assignments, returning the combined Statements.
 */
export async function getUserPolicies(userId: string, orgId: string): Promise<PolicyStatement[]> {
  const prisma = getPrismaClient();

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

  const statements: PolicyStatement[] = [];

  // Parse direct role policies
  if (orgMembership?.role) {
    for (const attachment of orgMembership.role.policyAttachments) {
      const doc = attachment.policy.document as unknown as PolicyDocument;
      if (doc?.statements) {
        statements.push(...doc.statements);
      }
    }
  }

  // Parse team role policies
  for (const tm of teamMemberships) {
    for (const assignment of tm.team.roleAssignments) {
      for (const attachment of assignment.role.policyAttachments) {
        const doc = attachment.policy.document as unknown as PolicyDocument;
        if (doc?.statements) {
          statements.push(...doc.statements);
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

  let isAllowed = false;

  for (const statement of statements) {
    // Check if the action matches any pattern in statement.actions
    const matchesAction = statement.actions.some((p) => isMatch(p, action));
    // Check if the resource matches any pattern in statement.resources
    const matchesResource = statement.resources.some((p) => isMatch(p, resourceUrn));

    if (matchesAction && matchesResource) {
      if (statement.effect === "DENY") {
        // Explicit DENY trumps everything immediately
        return false;
      }
      if (statement.effect === "ALLOW") {
        isAllowed = true;
      }
    }
  }

  return isAllowed;
}
