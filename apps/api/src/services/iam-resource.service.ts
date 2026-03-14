type GroupScopeInput = {
  orgId: string;
  vaultId: string;
  groupId: string;
  path?: string | null;
};

type SecretScopeInput = {
  orgId: string;
  vaultId: string;
  secretId: string;
  groupPath?: string | null;
};

export function buildGroupUrn(orgId: string, vaultId: string, groupId: string) {
  return `urn:hermes:org:${orgId}:vault:${vaultId}:group:${groupId}`;
}

export function buildGroupSubtreeUrn(orgId: string, vaultId: string, groupId: string) {
  return `${buildGroupUrn(orgId, vaultId, groupId)}:subtree`;
}

export function buildSecretUrn(orgId: string, vaultId: string, secretId: string) {
  return `urn:hermes:org:${orgId}:vault:${vaultId}:secret:${secretId}`;
}

export function getGroupPathIds(path?: string | null) {
  if (!path) {
    return [];
  }

  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function buildGroupCandidateResourceUrns(input: GroupScopeInput) {
  const ancestorIds = getGroupPathIds(input.path);
  const candidateIds = ancestorIds.length > 0 ? ancestorIds : [input.groupId];
  const resources = new Set<string>([buildGroupUrn(input.orgId, input.vaultId, input.groupId)]);

  for (const groupId of candidateIds) {
    resources.add(buildGroupSubtreeUrn(input.orgId, input.vaultId, groupId));
  }

  return Array.from(resources);
}

export function buildSecretCandidateResourceUrns(input: SecretScopeInput) {
  const resources = new Set<string>([buildSecretUrn(input.orgId, input.vaultId, input.secretId)]);

  for (const groupId of getGroupPathIds(input.groupPath)) {
    resources.add(buildGroupSubtreeUrn(input.orgId, input.vaultId, groupId));
  }

  return Array.from(resources);
}
