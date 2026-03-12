import Conf from "conf";
const CURRENT_SCHEMA_VERSION = 1;
const store = new Conf({
    projectName: "hermes-cli",
    schema: {
        schemaVersion: { type: "number", default: CURRENT_SCHEMA_VERSION },
        accessToken: { type: "string", default: "" },
        refreshToken: { type: "string", default: "" },
        user: { type: ["object", "null"], default: null },
        org: { type: ["object", "null"], default: null },
        vault: { type: ["object", "null"], default: null },
        serverUrl: {
            type: "string",
            default: "http://localhost:5001/api/v1",
        },
    },
    encryptionKey: "hermes-cli-encryption-key-v1",
});
function migrateStore() {
    const schemaVersion = store.get("schemaVersion") || 0;
    if (schemaVersion >= CURRENT_SCHEMA_VERSION) {
        return;
    }
    store.set("schemaVersion", CURRENT_SCHEMA_VERSION);
}
migrateStore();
export function saveTokens(tokens) {
    store.set("accessToken", tokens.accessToken);
    store.set("refreshToken", tokens.refreshToken);
}
export function getTokens() {
    const accessToken = store.get("accessToken");
    const refreshToken = store.get("refreshToken");
    if (!accessToken || !refreshToken)
        return null;
    return { accessToken, refreshToken };
}
export function clearTokens() {
    store.set("accessToken", "");
    store.set("refreshToken", "");
    store.set("user", null);
    store.set("org", null);
    store.set("vault", null);
}
export function isAuthenticated() {
    return !!getTokens()?.accessToken;
}
export function saveUser(user) {
    store.set("user", user);
}
export function getUser() {
    return store.get("user");
}
export function saveOrg(org) {
    store.set("org", org);
}
export function getOrg() {
    return store.get("org");
}
export function saveVault(vault) {
    store.set("vault", vault);
}
export function clearVault() {
    store.set("vault", null);
}
export function saveVaultId(vaultId) {
    const current = store.get("vault");
    if (!vaultId) {
        store.set("vault", null);
        return;
    }
    store.set("vault", current ? { ...current, id: vaultId } : { id: vaultId, name: vaultId, organizationId: "" });
}
export function getVault() {
    return store.get("vault");
}
export function getVaultId() {
    return store.get("vault")?.id || "";
}
export function getServerUrl() {
    return store.get("serverUrl");
}
export function setServerUrl(url) {
    store.set("serverUrl", url);
}
export function getStorePath() {
    return store.path;
}
