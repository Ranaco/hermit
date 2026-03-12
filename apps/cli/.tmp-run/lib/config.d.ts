export interface HermesEnvironment {
    organization?: string;
    vault: string;
    group?: string;
    path?: string;
    secrets?: string[];
    map?: Record<string, string>;
}
export interface HermesConfig {
    version: number;
    server?: string;
    environments: Record<string, HermesEnvironment>;
}
export declare function resolveConfigPath(explicitPath?: string): string | null;
export declare function loadProjectConfig(explicitPath?: string): HermesConfig | null;
export declare function resolveConfiguredServerUrl(explicitPath?: string): string | null;
export declare function validateProjectConfig(config: HermesConfig): {
    valid: boolean;
    errors: string[];
};
export declare function resolveEnvironmentConfig(config: HermesConfig | null, environmentName: string): HermesEnvironment;
export declare function generateTemplate(): string;
//# sourceMappingURL=config.d.ts.map