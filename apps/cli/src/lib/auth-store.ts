import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import Conf from "conf";
import envPaths from "env-paths";

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

export interface CliDeviceInfo {
  deviceId?: string;
  publicKey: string;
  privateKey: string;
  hardwareFingerprint: string;
  label: string;
  clientType: "CLI";
}

export interface GroupInfo {
  id: string;
  name: string;
}

export interface StoreSchema {
  schemaVersion: number;
  accessToken: string;
  refreshToken: string;
  user: UserInfo | null;
  org: OrgInfo | null;
  vault: VaultInfo | null;
  group: GroupInfo | null;
  serverUrl: string;
  cliDevice: CliDeviceInfo | null;
}

const PROJECT_NAME = "hermit-cli";
const PROJECT_SUFFIX = "nodejs";
const STORE_CONFIG_NAME = "config";
const STORE_FILE_EXTENSION = "json";
const LEGACY_ENCRYPTION_KEY = "hermit-cli-encryption-key-v1";
const ENCRYPTION_KEY_FILE = "store-key";
const CURRENT_SCHEMA_VERSION = 4;
const DEFAULT_SERVER_URL = "https://hermit.ranax.co/api/v1";

const configDirectory = envPaths(PROJECT_NAME, { suffix: PROJECT_SUFFIX }).config;
const storePath = resolve(configDirectory, `${STORE_CONFIG_NAME}.${STORE_FILE_EXTENSION}`);
const encryptionKeyPath = resolve(configDirectory, ENCRYPTION_KEY_FILE);

function createStore(encryptionKey: string): Conf<StoreSchema> {
  return new Conf<StoreSchema>({
    projectName: PROJECT_NAME,
    cwd: configDirectory,
    configName: STORE_CONFIG_NAME,
    fileExtension: STORE_FILE_EXTENSION,
    schema: {
      schemaVersion: { type: "number", default: CURRENT_SCHEMA_VERSION },
      accessToken: { type: "string", default: "" },
      refreshToken: { type: "string", default: "" },
      user: { type: ["object", "null"] as never, default: null },
      org: { type: ["object", "null"] as never, default: null },
      vault: { type: ["object", "null"] as never, default: null },
      group: { type: ["object", "null"] as never, default: null },
      serverUrl: {
        type: "string",
        default: DEFAULT_SERVER_URL,
      },
      cliDevice: { type: ["object", "null"] as never, default: null },
    },
    encryptionKey,
  } as ConstructorParameters<typeof Conf<StoreSchema>>[0]);
}

function getStoreSnapshot(conf: Conf<StoreSchema>): StoreSchema {
  return (conf as unknown as { store: StoreSchema }).store;
}

function setStoreSnapshot(conf: Conf<StoreSchema>, snapshot: StoreSchema): void {
  (conf as unknown as { store: StoreSchema }).store = snapshot;
}

function ensureConfigDirectory(): void {
  mkdirSync(configDirectory, { recursive: true });
}

function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}

function persistEncryptionKey(encryptionKey: string): void {
  ensureConfigDirectory();
  writeFileSync(encryptionKeyPath, encryptionKey, { encoding: "utf8", mode: 0o600 });
}

function readPersistedEncryptionKey(): string | null {
  if (!existsSync(encryptionKeyPath)) {
    return null;
  }

  const key = readFileSync(encryptionKeyPath, "utf8").trim();
  return key || null;
}

function snapshotLegacyStore(): StoreSchema | null {
  if (!existsSync(storePath)) {
    return null;
  }

  try {
    const legacyStore = createStore(LEGACY_ENCRYPTION_KEY);
    return getStoreSnapshot(legacyStore);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Hermit CLI could not unlock the existing credential store. If you removed the local store key file, restore it or re-authenticate. Underlying error: ${message}`,
    );
  }
}

function resolveEncryptionKey(): string {
  const persisted = readPersistedEncryptionKey();
  if (persisted) {
    return persisted;
  }

  const legacySnapshot = snapshotLegacyStore();
  const generatedKey = generateEncryptionKey();
  persistEncryptionKey(generatedKey);

  if (legacySnapshot) {
    const migratedStore = createStore(generatedKey);
    setStoreSnapshot(migratedStore, legacySnapshot);
  }

  return generatedKey;
}

let storeInstance: Conf<StoreSchema> | null = null;

function initializeStore(): Conf<StoreSchema> {
  if (storeInstance) {
    return storeInstance;
  }

  const store = createStore(resolveEncryptionKey());
  migrateStore(store);
  storeInstance = store;
  return store;
}

function getStore(): Conf<StoreSchema> {
  return initializeStore();
}

function migrateStore(store: Conf<StoreSchema>): void {
  const schemaVersion = store.get("schemaVersion") || 0;
  if (schemaVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  store.set("schemaVersion", CURRENT_SCHEMA_VERSION);
}

export function saveTokens(tokens: AuthTokens): void {
  const store = getStore();
  store.set("accessToken", tokens.accessToken);
  store.set("refreshToken", tokens.refreshToken);
}

export function getTokens(): AuthTokens | null {
  const store = getStore();
  const accessToken = store.get("accessToken");
  const refreshToken = store.get("refreshToken");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function clearTokens(): void {
  const store = getStore();
  store.set("accessToken", "");
  store.set("refreshToken", "");
  store.set("user", null);
  store.set("org", null);
  store.set("vault", null);
  store.set("group", null);
}

export function saveCliDevice(device: CliDeviceInfo): void {
  const store = getStore();
  store.set("cliDevice", device);
}

export function getCliDevice(): CliDeviceInfo | null {
  const store = getStore();
  return store.get("cliDevice");
}

export function updateCliDevice(partial: Partial<CliDeviceInfo>): void {
  const store = getStore();
  const current = store.get("cliDevice");
  if (!current) {
    return;
  }

  store.set("cliDevice", {
    ...current,
    ...partial,
  });
}

export function isAuthenticated(): boolean {
  return !!getTokens()?.accessToken;
}

export function saveUser(user: UserInfo): void {
  const store = getStore();
  store.set("user", user);
}

export function getUser(): UserInfo | null {
  const store = getStore();
  return store.get("user");
}

export function saveOrg(org: OrgInfo): void {
  const store = getStore();
  store.set("org", org);
}

export function getOrg(): OrgInfo | null {
  const store = getStore();
  return store.get("org");
}

export function saveVault(vault: VaultInfo): void {
  const store = getStore();
  store.set("vault", vault);
}

export function clearVault(): void {
  const store = getStore();
  store.set("vault", null);
}

export function saveVaultId(vaultId: string): void {
  const store = getStore();
  const current = store.get("vault");
  if (!vaultId) {
    store.set("vault", null);
    return;
  }

  store.set("vault", current ? { ...current, id: vaultId } : { id: vaultId, name: vaultId, organizationId: "" });
}

export function getVault(): VaultInfo | null {
  const store = getStore();
  return store.get("vault");
}

export function getVaultId(): string {
  const store = getStore();
  return store.get("vault")?.id || "";
}

export function getServerUrl(): string {
  const store = getStore();
  return store.get("serverUrl");
}

export function setServerUrl(url: string): void {
  const store = getStore();
  store.set("serverUrl", url);
}

export function getStorePath(): string {
  return storePath;
}

export function getStoreKeyPath(): string {
  return encryptionKeyPath;
}

export function getStoreDirectory(): string {
  return dirname(storePath);
}

export function saveGroup(group: GroupInfo): void {
  const store = getStore();
  store.set("group", group);
}

export function getGroup(): GroupInfo | null {
  const store = getStore();
  return store.get("group");
}

export function clearGroup(): void {
  const store = getStore();
  store.set("group", null);
}
