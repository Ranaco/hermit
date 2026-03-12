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
export declare function saveTokens(tokens: AuthTokens): void;
export declare function getTokens(): AuthTokens | null;
export declare function clearTokens(): void;
export declare function isAuthenticated(): boolean;
export declare function saveUser(user: UserInfo): void;
export declare function getUser(): UserInfo | null;
export declare function saveOrg(org: OrgInfo): void;
export declare function getOrg(): OrgInfo | null;
export declare function saveVault(vault: VaultInfo): void;
export declare function clearVault(): void;
export declare function saveVaultId(vaultId: string): void;
export declare function getVault(): VaultInfo | null;
export declare function getVaultId(): string;
export declare function getServerUrl(): string;
export declare function setServerUrl(url: string): void;
export declare function getStorePath(): string;
//# sourceMappingURL=auth-store.d.ts.map