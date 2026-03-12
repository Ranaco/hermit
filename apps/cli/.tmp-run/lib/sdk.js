import * as api from "./api-client.js";
export async function login(payload) {
    return api.post("/auth/login", payload, { skipAuth: true });
}
export async function logout(refreshToken) {
    return api.post("/auth/logout", { refreshToken });
}
export async function refresh(refreshToken) {
    return api.post("/auth/refresh", { refreshToken }, { skipAuth: true });
}
export async function setupMfa() {
    return api.post("/auth/mfa/setup");
}
export async function enableMfa(token) {
    return api.post("/auth/mfa/enable", { token });
}
export async function disableMfa(password, mfaToken) {
    return api.post("/auth/mfa/disable", { password, mfaToken });
}
export async function getOrganizations() {
    const result = await api.get("/organizations");
    return result.organizations;
}
export async function getOrganization(organizationId) {
    const result = await api.get(`/organizations/${organizationId}`);
    return result.organization;
}
export async function createOrganization(payload) {
    return api.post("/organizations", payload);
}
export async function getTeams(organizationId) {
    const result = await api.get(`/organizations/${organizationId}/teams`);
    return result.teams;
}
export async function createTeam(organizationId, payload) {
    const result = await api.post(`/organizations/${organizationId}/teams`, payload);
    return result.team;
}
export async function addTeamMember(organizationId, teamId, userId) {
    return api.post(`/organizations/${organizationId}/teams/${teamId}/members`, { userId });
}
export async function removeTeamMember(organizationId, teamId, userId) {
    await api.del(`/organizations/${organizationId}/teams/${teamId}/members/${userId}`);
}
export async function getVaults(organizationId) {
    const result = await api.get(`/vaults?organizationId=${organizationId}`);
    return result.vaults;
}
export async function getVault(vaultId) {
    const result = await api.get(`/vaults/${vaultId}`);
    return result.vault;
}
export async function createVault(payload) {
    const result = await api.post("/vaults", payload);
    return result.vault;
}
export async function deleteVault(vaultId) {
    await api.del(`/vaults/${vaultId}`);
}
export async function getKeys(vaultId) {
    const result = await api.get(`/keys?vaultId=${vaultId}`);
    return result.keys;
}
export async function getKey(keyId) {
    const result = await api.get(`/keys/${keyId}`);
    return result.key;
}
export async function createKey(payload) {
    const result = await api.post("/keys", payload);
    return result.key;
}
export async function rotateKey(keyId) {
    const result = await api.post(`/keys/${keyId}/rotate`, {});
    return result;
}
export async function deleteKey(keyId) {
    await api.del(`/keys/${keyId}`);
}
export async function getSecretGroups(vaultId, params = {}) {
    const search = new URLSearchParams({ vaultId });
    if (params.parentId) {
        search.set("parentId", params.parentId);
    }
    const result = await api.get(`/vaults/${vaultId}/groups?${search.toString()}`);
    return result;
}
export async function createSecretGroup(payload) {
    return api.post(`/vaults/${payload.vaultId}/groups`, payload);
}
export async function updateSecretGroup(vaultId, groupId, payload) {
    return api.put(`/vaults/${vaultId}/groups/${groupId}`, payload);
}
export async function deleteSecretGroup(vaultId, groupId) {
    await api.del(`/vaults/${vaultId}/groups/${groupId}`);
}
export async function getSecrets(vaultId, params = {}) {
    const search = new URLSearchParams({ vaultId });
    if (params.secretGroupId) {
        search.set("secretGroupId", params.secretGroupId);
    }
    if (params.search) {
        search.set("search", params.search);
    }
    const result = await api.get(`/secrets?${search.toString()}`);
    return result.secrets;
}
export async function createSecret(payload) {
    return api.post("/secrets", payload);
}
export async function updateSecret(secretId, payload) {
    return api.put(`/secrets/${secretId}`, payload);
}
export async function revealSecret(secretId, payload = {}) {
    return api.post(`/secrets/${secretId}/reveal`, payload);
}
export async function deleteSecret(secretId) {
    await api.del(`/secrets/${secretId}`);
}
export async function bulkRevealSecrets(payload) {
    return api.post("/secrets/bulk-reveal", payload);
}
