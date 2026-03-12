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
    _count?: {
        members: number;
    };
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
    _count?: {
        versions: number;
    };
    versions?: Array<{
        versionNumber: number;
        createdAt: string;
    }>;
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
    key?: {
        id: string;
        name: string;
    };
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
    secrets: Array<{
        name: string;
        value: string;
    }>;
    skipped: Array<{
        name: string;
        reason: string;
    }>;
    count: number;
    error?: {
        code: string;
        message: string;
    };
}
export interface LoginResult {
    user: SessionUser;
    organization: {
        id: string;
        name: string;
        slug?: string;
    } | null;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
    device: {
        id: string;
        isTrusted: boolean;
    } | null;
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
export declare function login(payload: {
    email: string;
    password: string;
    mfaToken?: string;
}): Promise<LoginResult>;
export declare function logout(refreshToken: string): Promise<{
    success: true;
}>;
export declare function refresh(refreshToken: string): Promise<{
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}>;
export declare function setupMfa(): Promise<MfaSetupResult>;
export declare function enableMfa(token: string): Promise<MfaEnableResult>;
export declare function disableMfa(password: string, mfaToken: string): Promise<{
    success: true;
}>;
export declare function getOrganizations(): Promise<OrganizationSummary[]>;
export declare function getOrganization(organizationId: string): Promise<OrganizationSummary>;
export declare function createOrganization(payload: {
    name: string;
    description?: string;
}): Promise<{
    organization: OrganizationSummary;
    vault: VaultSummary;
}>;
export declare function getTeams(organizationId: string): Promise<TeamSummary[]>;
export declare function createTeam(organizationId: string, payload: {
    name: string;
    description?: string;
}): Promise<TeamSummary>;
export declare function addTeamMember(organizationId: string, teamId: string, userId: string): Promise<{
    membership: {
        id: string;
        teamId: string;
        userId: string;
    };
}>;
export declare function removeTeamMember(organizationId: string, teamId: string, userId: string): Promise<void>;
export declare function getVaults(organizationId: string): Promise<VaultSummary[]>;
export declare function getVault(vaultId: string): Promise<VaultSummary>;
export declare function createVault(payload: {
    name: string;
    description?: string;
    organizationId: string;
    password?: string;
}): Promise<VaultSummary>;
export declare function deleteVault(vaultId: string): Promise<void>;
export declare function getKeys(vaultId: string): Promise<KeySummary[]>;
export declare function getKey(keyId: string): Promise<KeySummary>;
export declare function createKey(payload: {
    name: string;
    description?: string;
    vaultId: string;
    valueType?: string;
}): Promise<KeySummary>;
export declare function rotateKey(keyId: string): Promise<{
    versionNumber: number;
}>;
export declare function deleteKey(keyId: string): Promise<void>;
export declare function getSecretGroups(vaultId: string, params?: {
    parentId?: string | null;
}): Promise<SecretGroupSummary[]>;
export declare function createSecretGroup(payload: {
    vaultId: string;
    name: string;
    description?: string;
    parentId?: string;
}): Promise<SecretGroupSummary>;
export declare function updateSecretGroup(vaultId: string, groupId: string, payload: {
    name?: string;
    description?: string;
}): Promise<SecretGroupSummary>;
export declare function deleteSecretGroup(vaultId: string, groupId: string): Promise<void>;
export declare function getSecrets(vaultId: string, params?: {
    secretGroupId?: string;
    search?: string;
}): Promise<SecretSummary[]>;
export declare function createSecret(payload: {
    name: string;
    value: string;
    vaultId: string;
    keyId: string;
    valueType?: string;
    secretGroupId?: string;
    password?: string;
    description?: string;
}): Promise<{
    secret: SecretSummary;
}>;
export declare function updateSecret(secretId: string, payload: {
    value?: string;
    valueType?: string;
    description?: string;
    password?: string | null;
    secretGroupId?: string | null;
    commitMessage?: string;
}): Promise<{
    secret: SecretSummary;
}>;
export declare function revealSecret(secretId: string, payload?: {
    password?: string;
    vaultPassword?: string;
    versionNumber?: number;
}): Promise<SecretRevealResult>;
export declare function deleteSecret(secretId: string): Promise<void>;
export declare function bulkRevealSecrets(payload: {
    vaultId: string;
    secretGroupId?: string;
    password?: string;
    vaultPassword?: string;
}): Promise<BulkRevealResult>;
//# sourceMappingURL=sdk.d.ts.map