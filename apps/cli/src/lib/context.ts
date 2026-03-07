import * as sdk from "./sdk.js";
import * as authStore from "./auth-store.js";
import { matchId, shortId } from "./ui.js";

function exactNameMatch<T extends { name: string }>(items: T[], query: string): T | undefined {
  return items.find((item) => item.name.toLowerCase() === query.toLowerCase());
}

function shortIdMatch<T extends { id: string }>(items: T[], query: string): T | undefined {
  if (query.length < 4) return undefined;
  const matches = items.filter((item) => matchId(query, item.id));
  return matches.length === 1 ? matches[0] : undefined;
}

export function findByIdOrName<T extends { id: string; name: string }>(
  items: T[],
  query: string,
): T | undefined {
  return exactNameMatch(items, query) || shortIdMatch(items, query) || items.find((item) => item.id === query);
}

export async function requireOrganizations(): Promise<sdk.OrganizationSummary[]> {
  return sdk.getOrganizations();
}

export async function requireActiveOrganization(): Promise<sdk.OrganizationSummary> {
  const current = authStore.getOrg();
  if (current?.id) {
    const organizations = await sdk.getOrganizations();
    const match = organizations.find((organization) => organization.id === current.id);
    if (match) {
      return match;
    }
  }

  const organizations = await sdk.getOrganizations();
  if (organizations.length === 0) {
    throw new Error("No organizations found. Create one with `hermes org create`.");
  }

  const organization = organizations[0];
  authStore.saveOrg({ id: organization.id, name: organization.name, slug: organization.slug || undefined });
  authStore.clearVault();
  return organization;
}

export async function resolveOrganization(query?: string): Promise<sdk.OrganizationSummary> {
  const organizations = await sdk.getOrganizations();
  if (!query) {
    return requireActiveOrganization();
  }

  const match = findByIdOrName(organizations, query);
  if (!match) {
    throw new Error(`No organization matches "${query}".`);
  }
  return match;
}

export async function requireActiveVault(): Promise<sdk.VaultSummary> {
  const organization = await requireActiveOrganization();
  const vaults = await sdk.getVaults(organization.id);
  const currentVaultId = authStore.getVaultId();

  if (currentVaultId) {
    const current = vaults.find((vault) => vault.id === currentVaultId);
    if (current) {
      return current;
    }
  }

  if (vaults.length === 0) {
    throw new Error("No vaults found. Create one with `hermes vault create`.");
  }

  authStore.saveVault({
    id: vaults[0].id,
    name: vaults[0].name,
    organizationId: vaults[0].organizationId,
  });
  return vaults[0];
}

export async function resolveVault(query?: string): Promise<sdk.VaultSummary> {
  const organization = await requireActiveOrganization();
  const vaults = await sdk.getVaults(organization.id);

  if (!query) {
    return requireActiveVault();
  }

  const match = findByIdOrName(vaults, query);
  if (!match) {
    throw new Error(`No vault matches "${query}".`);
  }

  return match;
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
    current = groups.find((group) => group.name.toLowerCase() === segment.toLowerCase());
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

  const rootGroups = await sdk.getSecretGroups(vaultId);
  const direct = findByIdOrName(rootGroups, query);
  if (direct) {
    return direct;
  }

  const queue = [...rootGroups];
  while (queue.length > 0) {
    const group = queue.shift()!;
    if (group.id === query || shortId(group.id) === query) {
      return group;
    }
    const children = await sdk.getSecretGroups(vaultId, { parentId: group.id });
    const byName = children.find((item) => item.name.toLowerCase() === query.toLowerCase());
    if (byName) {
      return byName;
    }
    queue.push(...children);
  }

  throw new Error(`No secret group matches "${query}".`);
}
