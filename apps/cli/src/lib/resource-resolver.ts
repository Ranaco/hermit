import * as sdk from "./sdk.js";
import { matchId } from "./ui.js";

const SECRET_PAGE_SIZE = 200;

export interface GroupTreeNode {
  group: sdk.GroupSummary;
  path: string;
}

const groupChildrenCache = new Map<string, Promise<sdk.GroupSummary[]>>();
const secretListCache = new Map<string, Promise<sdk.SecretSummary[]>>();
const allGroupsCache = new Map<string, Promise<sdk.GroupSummary[]>>();
const groupTreeCache = new Map<string, Promise<GroupTreeNode[]>>();

function rootKey(parentId?: string | null): string {
  return parentId || "__root__";
}

function groupChildrenCacheKey(vaultId: string, parentId?: string | null): string {
  return `${vaultId}:${rootKey(parentId)}`;
}

function secretListCacheKey(vaultId: string, groupId?: string): string {
  return `${vaultId}:${groupId || "__root__"}`;
}

function exactNameMatch<T extends { name: string }>(items: T[], query: string): T[] {
  return items.filter((item) => item.name.toLowerCase() === query.toLowerCase());
}

function exactIdMatch<T extends { id: string }>(items: T[], query: string): T[] {
  return items.filter((item) => item.id === query);
}

function prefixIdMatch<T extends { id: string }>(items: T[], query: string): T[] {
  return items.filter((item) => matchId(query, item.id));
}

export async function getAccessibleGroupChildren(
  vaultId: string,
  parentId?: string | null,
): Promise<sdk.GroupSummary[]> {
  const cacheKey = groupChildrenCacheKey(vaultId, parentId);
  const cached = groupChildrenCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = sdk.getGroups(vaultId, parentId ? { parentId, cliScope: true } : { cliScope: true });
  groupChildrenCache.set(cacheKey, request);
  return request;
}

export async function getAccessibleGroupTree(
  vaultId: string,
  parentId?: string | null,
  pathPrefix = "",
): Promise<GroupTreeNode[]> {
  const cacheKey = `${vaultId}:${rootKey(parentId)}:${pathPrefix}`;
  const cached = groupTreeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    const groups = await getAccessibleGroupChildren(vaultId, parentId);
    const nodes: GroupTreeNode[] = [];

    for (const group of groups) {
      const path = pathPrefix ? `${pathPrefix}/${group.name}` : group.name;
      nodes.push({ group, path });
      nodes.push(...(await getAccessibleGroupTree(vaultId, group.id, path)));
    }

    return nodes;
  })();

  groupTreeCache.set(cacheKey, request);
  return request;
}

export async function getAllAccessibleGroups(vaultId: string): Promise<sdk.GroupSummary[]> {
  const cached = allGroupsCache.get(vaultId);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    const nodes = await getAccessibleGroupTree(vaultId);
    return nodes.map((node) => node.group);
  })();

  allGroupsCache.set(vaultId, request);
  return request;
}

export async function listSecretsForGroup(
  vaultId: string,
  groupId?: string,
): Promise<sdk.SecretSummary[]> {
  const cacheKey = secretListCacheKey(vaultId, groupId);
  const cached = secretListCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    const secrets: sdk.SecretSummary[] = [];
    let page = 1;

    while (true) {
      const batch = await sdk.getSecrets(vaultId, {
        groupId: groupId,
        page,
        limit: SECRET_PAGE_SIZE,
        cliScope: true,
      });
      secrets.push(...batch);
      if (batch.length < SECRET_PAGE_SIZE) {
        break;
      }
      page += 1;
    }

    return secrets;
  })();

  secretListCache.set(cacheKey, request);
  return request;
}

export async function findSecretCandidates(
  vaultId: string,
  groupId: string | undefined,
  query: string | undefined,
): Promise<sdk.SecretSummary[]> {
  const secrets = await listSecretsForGroup(vaultId, groupId);
  if (!query) {
    return secrets;
  }

  const exactNames = exactNameMatch(secrets, query);
  if (exactNames.length > 0) {
    return exactNames;
  }

  const exactIds = exactIdMatch(secrets, query);
  if (exactIds.length > 0) {
    return exactIds;
  }

  return prefixIdMatch(secrets, query);
}
