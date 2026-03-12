import * as sdk from "./sdk.js";
interface ResolveVaultOptions {
    organizationQuery?: string;
}
export declare function findByIdOrName<T extends {
    id: string;
    name: string;
}>(items: T[], query: string): T | undefined;
export declare function requireOrganizations(): Promise<sdk.OrganizationSummary[]>;
export declare function requireActiveOrganization(): Promise<sdk.OrganizationSummary>;
export declare function resolveOrganization(query?: string): Promise<sdk.OrganizationSummary>;
export declare function requireActiveVault(organizationQuery?: string): Promise<sdk.VaultSummary>;
export declare function resolveVault(query?: string, options?: ResolveVaultOptions): Promise<sdk.VaultSummary>;
export declare function resolveGroupByPath(vaultId: string, pathValue: string): Promise<sdk.SecretGroupSummary>;
export declare function resolveGroup(vaultId: string, query?: string, pathValue?: string): Promise<sdk.SecretGroupSummary | undefined>;
export {};
//# sourceMappingURL=context.d.ts.map