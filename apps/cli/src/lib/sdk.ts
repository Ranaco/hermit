import * as api from "./api-client.js";

export interface SessionUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  isTwoFactorEnabled?: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  userRole?: string;
  createdAt?: string;
  _count?: {
    members: number;
    vaults: number;
    teams?: number;
  };
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
}

export interface TeamSummary {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdAt?: string;
  _count?: { members: number };
  members?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
}

export interface VaultSummary {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    keys: number;
  };
}

export interface KeySummary {
  id: string;
  name: string;
  description?: string | null;
  vaultId: string;
  valueType?: string;
  createdAt: string;
  updatedAt?: string;
  _count?: { versions: number };
  versions?: Array<{ versionNumber: number; createdAt: string }>;
}

export interface SecretSummary {
  id: string;
  name: string;
  description?: string | null;
  valueType: string;
  keyId?: string;
  hasPassword?: boolean;
  updatedAt: string;
  currentVersion?: {
    versionNumber: number;
    createdAt: string;
  };
  key?: { id: string; name: string };
}

export interface SecretGroupSummary {
  id: string;
  name: string;
  description?: string | null;
  vaultId: string;
  parentId?: string | null;
  _count?: {
    secrets: number;
    children: number;
  };
}

export interface SecretRevealResult {
  secret: {
    id: string;
    name: string;
    value: string;
    description?: string;
    versionNumber: number;
    updatedAt: string;
  };
}

export interface BulkRevealResult {
  secrets: Array<{ name: string; value: string; valueType?: string }>;
  skipped: Array<{ name: string; reason: string }>;
  count: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface LoginResult {
  user: SessionUser;
  organization: { id: string; name: string; slug?: string } | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  device: { id: string; isTrusted: boolean } | null;
}

export interface MfaSetupResult {
  secret: string;
  qrCode: string;
}

export interface MfaEnableResult {
  backupCodes: string[];
}

export interface ConfigShowResult {
  organizations: OrganizationSummary[];
}

export async function login(payload: {
  email: string;
  password: string;
  mfaToken?: string;
}): Promise<LoginResult> {
  return api.post<LoginResult>("/auth/login", payload, { skipAuth: true });
}

export async function logout(refreshToken: string): Promise<{ success: true }> {
  return api.post("/auth/logout", { refreshToken });
}

export async function refresh(refreshToken: string): Promise<{
  tokens: { accessToken: string; refreshToken: string };
}> {
  return api.post("/auth/refresh", { refreshToken }, { skipAuth: true });
}

export async function setupMfa(): Promise<MfaSetupResult> {
  return api.post("/auth/mfa/setup");
}

export async function enableMfa(token: string): Promise<MfaEnableResult> {
  return api.post("/auth/mfa/enable", { token });
}

export async function disableMfa(password: string, mfaToken: string): Promise<{ success: true }> {
  return api.post("/auth/mfa/disable", { password, mfaToken });
}

export async function getOrganizations(): Promise<OrganizationSummary[]> {
  const result = await api.get<{ organizations: OrganizationSummary[] }>("/organizations");
  return result.organizations;
}

export async function getOrganization(organizationId: string): Promise<OrganizationSummary> {
  const result = await api.get<{ organization: OrganizationSummary }>(`/organizations/${organizationId}`);
  return result.organization;
}

export async function createOrganization(payload: {
  name: string;
  description?: string;
}): Promise<{ organization: OrganizationSummary; vault: VaultSummary }> {
  return api.post("/organizations", payload);
}

export async function getTeams(organizationId: string): Promise<TeamSummary[]> {
  const result = await api.get<{ teams: TeamSummary[] }>(`/organizations/${organizationId}/teams`);
  return result.teams;
}

export async function createTeam(
  organizationId: string,
  payload: { name: string; description?: string },
): Promise<TeamSummary> {
  const result = await api.post<{ team: TeamSummary }>(`/organizations/${organizationId}/teams`, payload);
  return result.team;
}

export async function addTeamMember(
  organizationId: string,
  teamId: string,
  userId: string,
): Promise<{ membership: { id: string; teamId: string; userId: string } }> {
  return api.post(
    `/organizations/${organizationId}/teams/${teamId}/members`,
    { userId },
  );
}

export async function removeTeamMember(
  organizationId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  await api.del(`/organizations/${organizationId}/teams/${teamId}/members/${userId}`);
}

export async function getVaults(organizationId: string): Promise<VaultSummary[]> {
  const result = await api.get<{ vaults: VaultSummary[] }>(`/vaults?organizationId=${organizationId}`);
  return result.vaults;
}

export async function getVault(vaultId: string): Promise<VaultSummary> {
  const result = await api.get<{ vault: VaultSummary }>(`/vaults/${vaultId}`);
  return result.vault;
}

export async function createVault(payload: {
  name: string;
  description?: string;
  organizationId: string;
  password?: string;
}): Promise<VaultSummary> {
  const result = await api.post<{ vault: VaultSummary }>("/vaults", payload);
  return result.vault;
}

export async function deleteVault(vaultId: string): Promise<void> {
  await api.del(`/vaults/${vaultId}`);
}

export async function getKeys(vaultId: string): Promise<KeySummary[]> {
  const result = await api.get<{ keys: KeySummary[] }>(`/keys?vaultId=${vaultId}`);
  return result.keys;
}

export async function getKey(keyId: string): Promise<KeySummary> {
  const result = await api.get<{ key: KeySummary }>(`/keys/${keyId}`);
  return result.key;
}

export async function createKey(payload: {
  name: string;
  description?: string;
  vaultId: string;
  valueType?: string;
}): Promise<KeySummary> {
  const result = await api.post<{ key: KeySummary }>("/keys", payload);
  return result.key;
}

export async function rotateKey(keyId: string): Promise<{ versionNumber: number }> {
  const result = await api.post<{ versionNumber: number }>(`/keys/${keyId}/rotate`, {});
  return result;
}

export async function deleteKey(keyId: string): Promise<void> {
  await api.del(`/keys/${keyId}`);
}

export async function getSecretGroups(
  vaultId: string,
  params: { parentId?: string | null } = {},
): Promise<SecretGroupSummary[]> {
  const search = new URLSearchParams({ vaultId });
  if (params.parentId) {
    search.set("parentId", params.parentId);
  }
  const result = await api.get<SecretGroupSummary[]>(`/vaults/${vaultId}/groups?${search.toString()}`);
  return result;
}

export async function createSecretGroup(payload: {
  vaultId: string;
  name: string;
  description?: string;
  parentId?: string;
}): Promise<SecretGroupSummary> {
  return api.post(`/vaults/${payload.vaultId}/groups`, payload);
}

export async function updateSecretGroup(
  vaultId: string,
  groupId: string,
  payload: { name?: string; description?: string },
): Promise<SecretGroupSummary> {
  return api.put(`/vaults/${vaultId}/groups/${groupId}`, payload);
}

export async function deleteSecretGroup(vaultId: string, groupId: string): Promise<void> {
  await api.del(`/vaults/${vaultId}/groups/${groupId}`);
}

export async function getSecrets(
  vaultId: string,
  params: { secretGroupId?: string; search?: string; page?: number; limit?: number } = {},
): Promise<SecretSummary[]> {
  const search = new URLSearchParams({ vaultId });
  if (params.secretGroupId) {
    search.set("secretGroupId", params.secretGroupId);
  }
  if (params.search) {
    search.set("search", params.search);
  }
  if (params.page) {
    search.set("page", String(params.page));
  }
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const result = await api.get<{ secrets: SecretSummary[] }>(`/secrets?${search.toString()}`);
  return result.secrets;
}

export async function createSecret(payload: {
  name: string;
  value: string;
  vaultId: string;
  keyId: string;
  valueType?: string;
  secretGroupId?: string;
  password?: string;
  description?: string;
}): Promise<{ secret: SecretSummary }> {
  return api.post("/secrets", payload);
}

export async function updateSecret(
  secretId: string,
  payload: {
    value?: string;
    valueType?: string;
    description?: string;
    password?: string | null;
    secretGroupId?: string | null;
    commitMessage?: string;
  },
): Promise<{ secret: SecretSummary }> {
  return api.put(`/secrets/${secretId}`, payload);
}

export async function revealSecret(
  secretId: string,
  payload: { password?: string; vaultPassword?: string; versionNumber?: number } = {},
): Promise<SecretRevealResult> {
  return api.post(`/secrets/${secretId}/reveal`, payload);
}

export async function deleteSecret(secretId: string): Promise<void> {
  await api.del(`/secrets/${secretId}`);
}

export async function bulkRevealSecrets(payload: {
  vaultId: string;
  secretGroupId?: string;
  secretIds?: string[];
  includeDescendants?: boolean;
  password?: string;
  vaultPassword?: string;
}): Promise<BulkRevealResult> {
  return api.post("/secrets/bulk-reveal", payload);
}
