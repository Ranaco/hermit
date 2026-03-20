import getPrismaClient from "./prisma.service";
import {
  type PolicyDocument,
  type PolicyStatementSource,
  explainPolicySourcesAgainstAny,
  getUserPolicySources,
} from "./policy-engine";
import {
  buildGroupCandidateResourceUrns,
  buildSecretCandidateResourceUrns,
} from "./iam-resource.service";

type GraphNodeType =
  | "organization"
  | "vault"
  | "group"
  | "key"
  | "secret"
  | "team"
  | "role"
  | "policy"
  | "member";

type GraphNode = {
  id: string;
  type: GraphNodeType;
  entityId: string;
  label: string;
  subtitle?: string | null;
  parentId?: string | null;
  meta?: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type:
    | "contains"
    | "belongs-to"
    | "member-of"
    | "assigned-role"
    | "attached-policy"
    | "protected-by-key";
};

function buildVaultUrn(orgId: string, vaultId: string) {
  return `urn:hermit:org:${orgId}:vault:${vaultId}`;
}

function buildKeyUrn(orgId: string, vaultId: string, keyId: string) {
  return `urn:hermit:org:${orgId}:vault:${vaultId}:key:${keyId}`;
}

function roleSourcesFromRole(role: {
  id: string;
  name: string;
  policyAttachments: Array<{
    policy: {
      id: string;
      name: string;
      document: unknown;
    };
  }>;
}): PolicyStatementSource[] {
  return role.policyAttachments.flatMap((attachment) => {
    const document = attachment.policy.document as PolicyDocument;
    return (document.statements || []).map((statement) => ({
      statement,
      policyId: attachment.policy.id,
      policyName: attachment.policy.name,
      roleId: role.id,
      roleName: role.name,
      sourceType: "member-role" as const,
    }));
  });
}

function teamSourcesFromAssignments(team: {
  id: string;
  name: string;
  roleAssignments: Array<{
    role: {
      id: string;
      name: string;
      policyAttachments: Array<{
        policy: {
          id: string;
          name: string;
          document: unknown;
        };
      }>;
    };
  }>;
}): PolicyStatementSource[] {
  return team.roleAssignments.flatMap((assignment) =>
    assignment.role.policyAttachments.flatMap((attachment) => {
      const document = attachment.policy.document as PolicyDocument;
      return (document.statements || []).map((statement) => ({
        statement,
        policyId: attachment.policy.id,
        policyName: attachment.policy.name,
        roleId: assignment.role.id,
        roleName: assignment.role.name,
        sourceType: "team-role" as const,
        teamId: team.id,
        teamName: team.name,
      }));
    }),
  );
}

function summarizeMatches(sources: PolicyStatementSource[]) {
  return Array.from(
    new Map(
      sources.map((source) => [
        `${source.policyId}:${source.roleId}:${source.teamId || "direct"}`,
        {
          policyId: source.policyId,
          policyName: source.policyName,
          roleId: source.roleId,
          roleName: source.roleName,
          sourceType: source.sourceType,
          teamId: source.teamId ?? null,
          teamName: source.teamName ?? null,
          effect: source.statement.effect,
          actions: source.statement.actions,
          resources: source.statement.resources,
        },
      ]),
    ).values(),
  );
}

function summarizeActionResults(results: ReturnType<typeof explainPolicySourcesAgainstAny>) {
  return results
    .filter((result) => result.allowed || result.denied)
    .map((result) => ({
      action: result.action,
      allowed: result.allowed,
      denied: result.denied,
      reasons: summarizeMatches(result.matches),
    }));
}

export async function buildOrganizationGraph(organizationId: string) {
  const prisma = getPrismaClient();
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      teams: {
        include: {
          members: {
            select: {
              id: true,
              userId: true,
            },
          },
          roleAssignments: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      roles: {
        include: {
          policyAttachments: {
            include: {
              policy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      policies: {
        select: {
          id: true,
          name: true,
          description: true,
          isManaged: true,
        },
      },
      vaults: {
        include: {
          secretGroups: {
            select: {
              id: true,
              name: true,
              parentId: true,
              depth: true,
              path: true,
            },
          },
          keys: {
            select: {
              id: true,
              name: true,
              valueType: true,
            },
          },
          secrets: {
            select: {
              id: true,
              name: true,
              secretGroupId: true,
              keyId: true,
              valueType: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const nodes: GraphNode[] = [
    {
      id: `organization:${organization.id}`,
      type: "organization",
      entityId: organization.id,
      label: organization.name,
      subtitle: organization.description,
    },
  ];
  const edges: GraphEdge[] = [];

  for (const vault of organization.vaults) {
    nodes.push({
      id: `vault:${vault.id}`,
      type: "vault",
      entityId: vault.id,
      label: vault.name,
      subtitle: vault.description,
      parentId: organization.id,
    });
    edges.push({
      id: `organization:${organization.id}->vault:${vault.id}`,
      from: `organization:${organization.id}`,
      to: `vault:${vault.id}`,
      type: "contains",
    });

    for (const group of vault.secretGroups) {
      nodes.push({
        id: `group:${group.id}`,
        type: "group",
        entityId: group.id,
        label: group.name,
        subtitle: `Depth ${group.depth}`,
        parentId: group.parentId || vault.id,
      });
      edges.push({
        id: `${group.parentId ? `group:${group.parentId}` : `vault:${vault.id}`}->group:${group.id}`,
        from: group.parentId ? `group:${group.parentId}` : `vault:${vault.id}`,
        to: `group:${group.id}`,
        type: "contains",
      });
    }

    for (const key of vault.keys) {
      nodes.push({
        id: `key:${key.id}`,
        type: "key",
        entityId: key.id,
        label: key.name,
        subtitle: key.valueType,
        parentId: vault.id,
      });
      edges.push({
        id: `vault:${vault.id}->key:${key.id}`,
        from: `vault:${vault.id}`,
        to: `key:${key.id}`,
        type: "contains",
      });
    }

    for (const secret of vault.secrets) {
      nodes.push({
        id: `secret:${secret.id}`,
        type: "secret",
        entityId: secret.id,
        label: secret.name,
        subtitle: secret.valueType,
        parentId: secret.secretGroupId || vault.id,
      });
      edges.push({
        id: `${secret.secretGroupId ? `group:${secret.secretGroupId}` : `vault:${vault.id}`}->secret:${secret.id}`,
        from: secret.secretGroupId ? `group:${secret.secretGroupId}` : `vault:${vault.id}`,
        to: `secret:${secret.id}`,
        type: "contains",
      });
      edges.push({
        id: `secret:${secret.id}->key:${secret.keyId}`,
        from: `secret:${secret.id}`,
        to: `key:${secret.keyId}`,
        type: "protected-by-key",
      });
    }
  }

  for (const member of organization.members) {
    const displayName =
      `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
      member.user.username ||
      member.user.email;
    nodes.push({
      id: `member:${member.id}`,
      type: "member",
      entityId: member.id,
      label: displayName,
      subtitle: member.user.email,
    });
    edges.push({
      id: `organization:${organization.id}->member:${member.id}`,
      from: `organization:${organization.id}`,
      to: `member:${member.id}`,
      type: "belongs-to",
    });
    if (member.roleId) {
      edges.push({
        id: `member:${member.id}->role:${member.roleId}`,
        from: `member:${member.id}`,
        to: `role:${member.roleId}`,
        type: "assigned-role",
      });
    }
  }

  for (const team of organization.teams) {
    nodes.push({
      id: `team:${team.id}`,
      type: "team",
      entityId: team.id,
      label: team.name,
      subtitle: team.description,
    });
    edges.push({
      id: `organization:${organization.id}->team:${team.id}`,
      from: `organization:${organization.id}`,
      to: `team:${team.id}`,
      type: "contains",
    });

    for (const member of team.members) {
      const orgMember = organization.members.find((item) => item.userId === member.userId);
      if (!orgMember) continue;
      edges.push({
        id: `member:${orgMember.id}->team:${team.id}`,
        from: `member:${orgMember.id}`,
        to: `team:${team.id}`,
        type: "member-of",
      });
    }

    for (const assignment of team.roleAssignments) {
      edges.push({
        id: `team:${team.id}->role:${assignment.role.id}`,
        from: `team:${team.id}`,
        to: `role:${assignment.role.id}`,
        type: "assigned-role",
      });
    }
  }

  for (const role of organization.roles) {
    nodes.push({
      id: `role:${role.id}`,
      type: "role",
      entityId: role.id,
      label: role.name,
      subtitle: role.description,
      meta: { isDefault: role.isDefault },
    });
    edges.push({
      id: `organization:${organization.id}->role:${role.id}`,
      from: `organization:${organization.id}`,
      to: `role:${role.id}`,
      type: "contains",
    });

    for (const attachment of role.policyAttachments) {
      edges.push({
        id: `role:${role.id}->policy:${attachment.policy.id}`,
        from: `role:${role.id}`,
        to: `policy:${attachment.policy.id}`,
        type: "attached-policy",
      });
    }
  }

  for (const policy of organization.policies) {
    nodes.push({
      id: `policy:${policy.id}`,
      type: "policy",
      entityId: policy.id,
      label: policy.name,
      subtitle: policy.description,
      meta: { isManaged: policy.isManaged },
    });
    edges.push({
      id: `organization:${organization.id}->policy:${policy.id}`,
      from: `organization:${organization.id}`,
      to: `policy:${policy.id}`,
      type: "contains",
    });
  }

  return {
    nodes,
    edges,
    counts: {
      vaults: organization.vaults.length,
      groups: organization.vaults.reduce((total, vault) => total + vault.secretGroups.length, 0),
      keys: organization.vaults.reduce((total, vault) => total + vault.keys.length, 0),
      secrets: organization.vaults.reduce((total, vault) => total + vault.secrets.length, 0),
      teams: organization.teams.length,
      roles: organization.roles.length,
      policies: organization.policies.length,
      members: organization.members.length,
    },
  };
}

export async function buildOrganizationGraphAccess(
  organizationId: string,
  nodeType: GraphNodeType,
  nodeId: string,
) {
  const prisma = getPrismaClient();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } },
          role: {
            include: {
              policyAttachments: {
                include: {
                  policy: true,
                },
              },
            },
          },
        },
      },
      teams: {
        include: {
          roleAssignments: {
            include: {
              role: {
                include: {
                  policyAttachments: {
                    include: {
                      policy: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      roles: {
        include: {
          policyAttachments: {
            include: {
              policy: true,
            },
          },
        },
      },
      policies: true,
      vaults: {
        include: {
          secretGroups: true,
          keys: true,
          secrets: {
            include: {
              secretGroup: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const allVaults = organization.vaults;
  const allGroups = allVaults.flatMap((vault) =>
    vault.secretGroups.map((group) => ({ ...group, organizationId })),
  );
  const allSecrets = allVaults.flatMap((vault) =>
    vault.secrets.map((secret) => ({
      ...secret,
      organizationId,
      vaultId: vault.id,
    })),
  );

  if (nodeType === "policy") {
    const policy = organization.policies.find((item) => item.id === nodeId);
    if (!policy) return null;
    const attachedRoles = organization.roles
      .filter((role) => role.policyAttachments.some((attachment) => attachment.policyId === policy.id))
      .map((role) => ({ id: role.id, name: role.name, description: role.description }));

    return {
      nodeType,
      nodeId,
      title: policy.name,
      subtitle: policy.description,
      details: {
        attachedRoles,
        document: policy.document,
      },
    };
  }

  if (nodeType === "role") {
    const role = organization.roles.find((item) => item.id === nodeId);
    if (!role) return null;

    const sources = roleSourcesFromRole(role);
    return {
      nodeType,
      nodeId,
      title: role.name,
      subtitle: role.description,
      resourceAccess: {
        vaults: allVaults
          .map((vault) => {
            const results = explainPolicySourcesAgainstAny(sources, ["vaults:read"], [buildVaultUrn(organizationId, vault.id)]);
            return { vault, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed))
          .map(({ vault, results }) => ({
            id: vault.id,
            name: vault.name,
            actions: summarizeActionResults(results),
          })),
        groups: allGroups
          .map((group) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["groups:read", "secrets:read", "secrets:use", "secrets:cli-use"],
              buildGroupCandidateResourceUrns({
                orgId: organizationId,
                vaultId: group.vaultId,
                groupId: group.id,
                path: group.path,
              }),
            );
            return { group, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed))
          .map(({ group, results }) => ({
            id: group.id,
            name: group.name,
            actions: summarizeActionResults(results),
          })),
        secrets: allSecrets
          .map((secret) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["secrets:read", "secrets:use", "secrets:cli-use"],
              buildSecretCandidateResourceUrns({
                orgId: organizationId,
                vaultId: secret.vaultId,
                secretId: secret.id,
                groupPath: secret.secretGroup?.path,
              }),
            );
            return { secret, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed))
          .map(({ secret, results }) => ({
            id: secret.id,
            name: secret.name,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  if (nodeType === "team") {
    const team = organization.teams.find((item) => item.id === nodeId);
    if (!team) return null;
    const sources = teamSourcesFromAssignments(team);
    return {
      nodeType,
      nodeId,
      title: team.name,
      subtitle: team.description,
      resourceAccess: {
        vaults: allVaults
          .map((vault) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["vaults:read"],
              [buildVaultUrn(organizationId, vault.id)],
            );
            return { vault, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed))
          .map(({ vault, results }) => ({
            id: vault.id,
            name: vault.name,
            actions: summarizeActionResults(results),
          })),
        groups: allGroups
          .map((group) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["groups:read", "secrets:read", "secrets:use", "secrets:cli-use"],
              buildGroupCandidateResourceUrns({
                orgId: organizationId,
                vaultId: group.vaultId,
                groupId: group.id,
                path: group.path,
              }),
            );
            return { group, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed))
          .map(({ group, results }) => ({
            id: group.id,
            name: group.name,
            actions: summarizeActionResults(results),
          })),
        secrets: allSecrets
          .map((secret) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["secrets:read", "secrets:use", "secrets:cli-use"],
              buildSecretCandidateResourceUrns({
                orgId: organizationId,
                vaultId: secret.vaultId,
                secretId: secret.id,
                groupPath: secret.secretGroup?.path,
              }),
            );
            return { secret, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ secret, results }) => ({
            id: secret.id,
            name: secret.name,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  if (nodeType === "member") {
    const member = organization.members.find((item) => item.id === nodeId);
    if (!member) return null;
    const displayName =
      `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
      member.user.username ||
      member.user.email;
    const sources = await getUserPolicySources(member.userId, organizationId);
    return {
      nodeType,
      nodeId,
      title: displayName,
      subtitle: member.user.email,
      resourceAccess: {
        vaults: allVaults
          .map((vault) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["vaults:read"],
              [buildVaultUrn(organizationId, vault.id)],
            );
            return { vault, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ vault, results }) => ({
            id: vault.id,
            name: vault.name,
            actions: summarizeActionResults(results),
          })),
        secrets: allSecrets
          .map((secret) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["secrets:read", "secrets:use", "secrets:cli-use"],
              buildSecretCandidateResourceUrns({
                orgId: organizationId,
                vaultId: secret.vaultId,
                secretId: secret.id,
                groupPath: secret.secretGroup?.path,
              }),
            );
            return { secret, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ secret, results }) => ({
            id: secret.id,
            name: secret.name,
            actions: summarizeActionResults(results),
          })),
        groups: allGroups
          .map((group) => {
            const results = explainPolicySourcesAgainstAny(
              sources,
              ["groups:read", "secrets:read", "secrets:use", "secrets:cli-use"],
              buildGroupCandidateResourceUrns({
                orgId: organizationId,
                vaultId: group.vaultId,
                groupId: group.id,
                path: group.path,
              }),
            );
            return { group, results };
          })
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ group, results }) => ({
            id: group.id,
            name: group.name,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  if (nodeType === "secret") {
    const secret = allSecrets.find((item) => item.id === nodeId);
    if (!secret) return null;
    const resourceUrns = buildSecretCandidateResourceUrns({
      orgId: organizationId,
      vaultId: secret.vaultId,
      secretId: secret.id,
      groupPath: secret.secretGroup?.path,
    });

    const members = await Promise.all(
      organization.members.map(async (member) => {
        const sources = await getUserPolicySources(member.userId, organizationId);
        const results = explainPolicySourcesAgainstAny(
          sources,
          ["secrets:read", "secrets:use", "secrets:cli-use"],
          resourceUrns,
        );
        return { member, results };
      }),
    );

    const teams = organization.teams.map((team) => ({
      team,
      results: explainPolicySourcesAgainstAny(
        teamSourcesFromAssignments(team),
        ["secrets:read", "secrets:use", "secrets:cli-use"],
        resourceUrns,
      ),
    }));

    const roles = organization.roles.map((role) => ({
      role,
      results: explainPolicySourcesAgainstAny(
        roleSourcesFromRole(role),
        ["secrets:read", "secrets:use", "secrets:cli-use"],
        resourceUrns,
      ),
    }));

    return {
      nodeType,
      nodeId,
      title: secret.name,
      subtitle: secret.valueType,
      principalAccess: {
        members: members
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ member, results }) => ({
            id: member.id,
            name:
              `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
              member.user.username ||
              member.user.email,
            email: member.user.email,
            actions: summarizeActionResults(results),
          })),
        teams: teams
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ team, results }) => ({
            id: team.id,
            name: team.name,
            actions: summarizeActionResults(results),
          })),
        roles: roles
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ role, results }) => ({
            id: role.id,
            name: role.name,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  if (nodeType === "group") {
    const group = allGroups.find((item) => item.id === nodeId);
    if (!group) return null;
    const resourceUrns = buildGroupCandidateResourceUrns({
      orgId: organizationId,
      vaultId: group.vaultId,
      groupId: group.id,
      path: group.path,
    });
    const members = await Promise.all(
      organization.members.map(async (member) => {
        const sources = await getUserPolicySources(member.userId, organizationId);
        const results = explainPolicySourcesAgainstAny(
          sources,
          ["groups:read", "secrets:read", "secrets:use", "secrets:cli-use"],
          resourceUrns,
        );
        return { member, results };
      }),
    );

    return {
      nodeType,
      nodeId,
      title: group.name,
      subtitle: `Depth ${group.depth}`,
      principalAccess: {
        members: members
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ member, results }) => ({
            id: member.id,
            name:
              `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
              member.user.username ||
              member.user.email,
            email: member.user.email,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  if (nodeType === "vault") {
    const vault = allVaults.find((item) => item.id === nodeId);
    if (!vault) return null;
    const resourceUrns = [buildVaultUrn(organizationId, vault.id)];
    const members = await Promise.all(
      organization.members.map(async (member) => {
        const sources = await getUserPolicySources(member.userId, organizationId);
        const results = explainPolicySourcesAgainstAny(
          sources,
          ["vaults:read", "vaults:update", "keys:read", "groups:read", "secrets:read", "secrets:cli-use"],
          resourceUrns,
        );
        return { member, results };
      }),
    );

    return {
      nodeType,
      nodeId,
      title: vault.name,
      subtitle: vault.description,
      principalAccess: {
        members: members
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ member, results }) => ({
            id: member.id,
            name:
              `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
              member.user.username ||
              member.user.email,
            email: member.user.email,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  if (nodeType === "key") {
    const key = allVaults.flatMap((vault) => vault.keys.map((item) => ({ ...item, vaultId: vault.id }))).find((item) => item.id === nodeId);
    if (!key) return null;
    const members = await Promise.all(
      organization.members.map(async (member) => {
        const sources = await getUserPolicySources(member.userId, organizationId);
        const results = explainPolicySourcesAgainstAny(
          sources,
          ["keys:read", "keys:use", "keys:update"],
          [buildKeyUrn(organizationId, key.vaultId, key.id)],
        );
        return { member, results };
      }),
    );

    return {
      nodeType,
      nodeId,
      title: key.name,
      subtitle: key.valueType,
      principalAccess: {
        members: members
          .filter(({ results }) => results.some((result) => result.allowed || result.denied))
          .map(({ member, results }) => ({
            id: member.id,
            name:
              `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
              member.user.username ||
              member.user.email,
            email: member.user.email,
            actions: summarizeActionResults(results),
          })),
      },
    };
  }

  const organizationNode = nodeType === "organization" && organization.id === nodeId ? organization : null;
  if (!organizationNode) {
    return null;
  }

  return {
    nodeType,
    nodeId,
    title: organization.name,
    subtitle: organization.description,
    details: {
      counts: {
        members: organization.members.length,
        teams: organization.teams.length,
        roles: organization.roles.length,
        policies: organization.policies.length,
        vaults: organization.vaults.length,
      },
    },
  };
}
