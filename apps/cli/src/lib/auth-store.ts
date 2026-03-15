import Conf from "conf";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  username?: string;
  role?: string;
  mfaEnabled?: boolean;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug?: string;
}

export interface VaultInfo {
  id: string;
  name: string;
  organizationId: string;
}

export interface StoreSchema {
  schemaVersion: number;
  accessToken: string;
  refreshToken: string;
  user: UserInfo | null;
  org: OrgInfo | null;
  vault: VaultInfo | null;
  serverUrl: string;
}

const CURRENT_SCHEMA_VERSION = 1;

const store = new Conf<StoreSchema>({
  projectName: "hermit-cli",
  schema: {
    schemaVersion: { type: "number", default: CURRENT_SCHEMA_VERSION },
    accessToken: { type: "string", default: "" },
    refreshToken: { type: "string", default: "" },
    user: { type: ["object", "null"] as never, default: null },
    org: { type: ["object", "null"] as never, default: null },
    vault: { type: ["object", "null"] as never, default: null },
    serverUrl: {
      type: "string",
      default: "http://localhost:5001/api/v1",
    },
  },
  encryptionKey: "hermit-cli-encryption-key-v1",
});

function migrateStore(): void {
  const schemaVersion = store.get("schemaVersion") || 0;
  if (schemaVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  store.set("schemaVersion", CURRENT_SCHEMA_VERSION);
}

migrateStore();

export function saveTokens(tokens: AuthTokens): void {
  store.set("accessToken", tokens.accessToken);
  store.set("refreshToken", tokens.refreshToken);
}

export function getTokens(): AuthTokens | null {
  const accessToken = store.get("accessToken");
  const refreshToken = store.get("refreshToken");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function clearTokens(): void {
  store.set("accessToken", "");
  store.set("refreshToken", "");
  store.set("user", null);
  store.set("org", null);
  store.set("vault", null);
}

export function isAuthenticated(): boolean {
  return !!getTokens()?.accessToken;
}

export function saveUser(user: UserInfo): void {
  store.set("user", user);
}

export function getUser(): UserInfo | null {
  return store.get("user");
}

export function saveOrg(org: OrgInfo): void {
  store.set("org", org);
}

export function getOrg(): OrgInfo | null {
  return store.get("org");
}

export function saveVault(vault: VaultInfo): void {
  store.set("vault", vault);
}

export function clearVault(): void {
  store.set("vault", null);
}

export function saveVaultId(vaultId: string): void {
  const current = store.get("vault");
  if (!vaultId) {
    store.set("vault", null);
    return;
  }

  store.set("vault", current ? { ...current, id: vaultId } : { id: vaultId, name: vaultId, organizationId: "" });
}

export function getVault(): VaultInfo | null {
  return store.get("vault");
}

export function getVaultId(): string {
  return store.get("vault")?.id || "";
}

export function getServerUrl(): string {
  return store.get("serverUrl");
}

export function setServerUrl(url: string): void {
  store.set("serverUrl", url);
}

export function getStorePath(): string {
  return store.path;
}
