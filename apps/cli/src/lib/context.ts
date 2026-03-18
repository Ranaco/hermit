import * as sdk from "./sdk.js";
import * as authStore from "./auth-store.js";
import { abort } from "./command-helpers.js";
import { matchId } from "./ui.js";

interface ResolveVaultOptions {
  organizationQuery?: string;
}

function exactNameMatch<T extends { name: string }>(items: T[], query: string): T | undefined {
  return items.find((item) => item.name.toLowerCase() === query.toLowerCase());
}

function shortIdMatch<T extends { id: string }>(items: T[], query: string): T | undefined {
  const matches = items.filter((item) => matchId(query, item.id));
  return matches.length === 1 ? matches[0] : undefined;
}

export function findByIdOrName<T extends { id: string; name: string }>(
  items: T[],
  query: string,
): T | undefined {
  return exactNameMatch(items, query) || shortIdMatch(items, query) || items.find((item) => item.id === query);
}

export function requireByIdOrName<T extends { id: string; name: string }>(
  items: T[],
  query: string,
  entityLabel: string,
): T {
  const exactName = exactNameMatch(items, query);
  if (exactName) {
    return exactName;
  }

  const exactId = items.find((item) => item.id === query);
  if (exactId) {
    return exactId;
  }

  const prefixMatches = items.filter((item) => matchId(query, item.id));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  if (prefixMatches.length > 1) {
    abort(`Multiple ${entityLabel}s match "${query}".`, {
      suggestions: [`Use a longer ${entityLabel} id prefix or the exact ${entityLabel} name.`],
      details: {
        matches: prefixMatches.map((item) => ({ id: item.id, name: item.name })),
      },
    });
  }

  abort(`No ${entityLabel} matches "${query}".`);
}

export async function requireOrganizations(): Promise<sdk.OrganizationSummary[]> {
  return sdk.getOrganizations();
}

export async function requireActiveOrganization(): Promise<sdk.OrganizationSummary> {
  const organizations = await sdk.getOrganizations();
  const current = authStore.getOrg();

  if (current?.id) {
    const match = organizations.find((organization) => organization.id === current.id);
    if (match) {
      return match;
    }
  }

  if (organizations.length === 0) {
    abort("No organizations found.", { suggestions: ["Run: hermit org create"] });
  }

  if (organizations.length === 1) {
    const organization = organizations[0];
    authStore.saveOrg({ id: organization.id, name: organization.name, slug: organization.slug || undefined });
    authStore.clearVault();
    return organization;
  }

  abort("No active organization selected.", {
    suggestions: ["Run: hermit org select <org>"],
    details: { organizations: organizations.map((organization) => ({ id: organization.id, name: organization.name })) },
  });
}

export async function resolveOrganization(query?: string): Promise<sdk.OrganizationSummary> {
  if (!query) {
    return requireActiveOrganization();
  }

  const organizations = await sdk.getOrganizations();
  return requireByIdOrName(organizations, query, "organization");
}

export async function requireActiveVault(organizationQuery?: string): Promise<sdk.VaultSummary> {
  const organization = await resolveOrganization(organizationQuery);
  const vaults = await sdk.getVaults(organization.id);
  const currentVaultId = authStore.getVaultId();

  if (currentVaultId) {
    const current = vaults.find((vault) => vault.id === currentVaultId);
    if (current) {
      return current;
    }
  }

  if (vaults.length === 0) {
    throw new Error("No vaults found. Create one with `hermit vault create`.");
  }

  if (vaults.length === 1) {
    authStore.saveVault({
      id: vaults[0].id,
      name: vaults[0].name,
      organizationId: vaults[0].organizationId,
    });
    return vaults[0];
  }

  abort("No active vault selected.", {
    suggestions: ["Run: hermit vault select <vault>"],
    details: { vaults: vaults.map((vault) => ({ id: vault.id, name: vault.name })) },
  });
}

export async function resolveVault(query?: string, options: ResolveVaultOptions = {}): Promise<sdk.VaultSummary> {
  const organization = await resolveOrganization(options.organizationQuery);
  const vaults = await sdk.getVaults(organization.id);

  if (!query) {
    return requireActiveVault(organization.id);
  }

  return requireByIdOrName(vaults, query, "vault");
}

export async function resolveKey(vaultId: string, query: string): Promise<sdk.KeySummary> {
  const keys = await sdk.getKeys(vaultId);
  return requireByIdOrName(keys, query, "key");
}

export async function resolveGroupByPath(
  vaultId: string,
  pathValue: string,
): Promise<sdk.SecretGroupSummary> {
  const segments = pathValue.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Secret group path is empty.");
  }

  let parentId: string | null = null;
  let current: sdk.SecretGroupSummary | undefined;

  for (const segment of segments) {
    const groups = await sdk.getSecretGroups(vaultId, parentId ? { parentId } : {});
    // Try exact name match first
    current = groups.find((group) => group.name.toLowerCase() === segment.toLowerCase());
    // Fall back to exact ID match
    if (!current) {
      current = groups.find((group) => group.id === segment);
    }
    // Fall back to ID prefix match
    if (!current) {
      const prefixMatches = groups.filter((group) => matchId(segment, group.id));
      if (prefixMatches.length === 1) {
        current = prefixMatches[0];
      } else if (prefixMatches.length > 1) {
        throw new Error(`Multiple groups match ID prefix "${segment}". Use a longer prefix or the exact name.`);
      }
    }
    if (!current) {
      throw new Error(`No secret group path matches "${pathValue}".`);
    }
    parentId = current.id;
  }

  if (!current) {
    throw new Error(`No secret group path matches "${pathValue}".`);
  }

  return current;
}

export async function resolveGroup(
  vaultId: string,
  query?: string,
  pathValue?: string,
): Promise<sdk.SecretGroupSummary | undefined> {
  if (pathValue) {
    return resolveGroupByPath(vaultId, pathValue);
  }
  if (!query) {
    return undefined;
  }

  const allGroups = await sdk.getSecretGroups(vaultId);
  const queue = [...allGroups];
  while (queue.length > 0) {
    const group = queue.shift()!;
    const children = await sdk.getSecretGroups(vaultId, { parentId: group.id });
    allGroups.push(...children);
    queue.push(...children);
  }

  return requireByIdOrName(allGroups, query, "secret group");
}
