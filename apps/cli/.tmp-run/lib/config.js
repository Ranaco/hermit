import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { abort } from "./command-helpers.js";
const CONFIG_FILENAMES = [".hermes.yml", ".hermes.yaml"];
export function resolveConfigPath(explicitPath) {
    if (explicitPath) {
        const resolved = resolve(explicitPath);
        return existsSync(resolved) ? resolved : null;
    }
    for (const filename of CONFIG_FILENAMES) {
        const resolved = resolve(process.cwd(), filename);
        if (existsSync(resolved)) {
            return resolved;
        }
    }
    return null;
}
export function loadProjectConfig(explicitPath) {
    const path = resolveConfigPath(explicitPath);
    if (!path) {
        return null;
    }
    const parsed = parse(readFileSync(path, "utf8"));
    return parsed;
}
export function resolveConfiguredServerUrl(explicitPath) {
    const config = loadProjectConfig(explicitPath);
    const server = config?.server?.trim();
    return server ? server : null;
}
export function validateProjectConfig(config) {
    const errors = [];
    if (config.version !== 1) {
        errors.push("Only config version 1 is supported.");
    }
    if (!config.environments || typeof config.environments !== "object") {
        errors.push("Config must define environments.");
    }
    else {
        for (const [name, environment] of Object.entries(config.environments)) {
            if (!environment.vault) {
                errors.push(`Environment "${name}" must define a vault.`);
            }
            if (environment.group && environment.path) {
                errors.push(`Environment "${name}" cannot define both group and path.`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
export function resolveEnvironmentConfig(config, environmentName) {
    if (!config) {
        abort("No .hermes.yml found.", { suggestions: ["Run: hermes config init"] });
    }
    const validation = validateProjectConfig(config);
    if (!validation.valid) {
        abort("Invalid .hermes.yml configuration.", { details: validation.errors });
    }
    const environment = config.environments[environmentName];
    if (!environment) {
        abort(`Environment "${environmentName}" not found.`, {
            details: { available: Object.keys(config.environments) },
        });
    }
    return environment;
}
export function generateTemplate() {
    return `# Hermes CLI configuration
# Docs: https://hermes.dev/docs/cli

version: 1
# server: https://hermes.example.com/api/v1

environments:
  development:
    # organization: acme
    vault: my-project
    path: dev/api
    # secrets:
    #   - DATABASE_URL
    #   - REDIS_URL
    # map:
    #   DATABASE_URL: APP_DATABASE_URL

  production:
    # organization: acme
    vault: my-project
    group: prod-config
`;
}
