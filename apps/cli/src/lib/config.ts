import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { abort } from "./command-helpers.js";

export interface HermitEnvironment {
  organization?: string;
  vault: string;
  group?: string;
  path?: string;
  recursive?: boolean;
  secrets?: string[];
  map?: Record<string, string>;
}

export interface HermitConfig {
  version: number;
  server?: string;
  environments: Record<string, HermitEnvironment>;
}

const CONFIG_FILENAMES = [".hermit.yml", ".hermit.yaml"];

export function resolveConfigPath(explicitPath?: string): string | null {
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

export function loadProjectConfig(explicitPath?: string): HermitConfig | null {
  const path = resolveConfigPath(explicitPath);
  if (!path) {
    return null;
  }

  const parsed = parse(readFileSync(path, "utf8")) as HermitConfig;
  return parsed;
}

export function resolveConfiguredServerUrl(explicitPath?: string): string | null {
  const config = loadProjectConfig(explicitPath);
  const server = config?.server?.trim();
  return server ? server : null;
}

export function validateProjectConfig(config: HermitConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (config.version !== 1) {
    errors.push("Only config version 1 is supported.");
  }
  if (!config.environments || typeof config.environments !== "object") {
    errors.push("Config must define environments.");
  } else {
    for (const [name, environment] of Object.entries(config.environments)) {
      if (!environment.vault) {
        errors.push(`Environment "${name}" must define a vault.`);
      }
      if (environment.group && environment.path) {
        errors.push(`Environment "${name}" cannot define both group and path.`);
      }
      if (environment.recursive !== undefined && typeof environment.recursive !== "boolean") {
        errors.push(`Environment "${name}" recursive must be true or false.`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function resolveEnvironmentConfig(config: HermitConfig | null, environmentName: string): HermitEnvironment {
  if (!config) {
    abort("No .hermit.yml found.", { suggestions: ["Run: hermit config init"] });
  }
  const validation = validateProjectConfig(config);
  if (!validation.valid) {
    abort("Invalid .hermit.yml configuration.", { details: validation.errors });
  }
  const environment = config.environments[environmentName];
  if (!environment) {
    abort(`Environment "${environmentName}" not found.`, {
      details: { available: Object.keys(config.environments) },
    });
  }
  return environment;
}

export function generateTemplate(): string {
  return `# Hermit CLI configuration
# Docs: https://hermit.dev/docs/cli

version: 1
# server: https://hermit.example.com/api/v1

environments:
  development:
    # organization: acme
    vault: my-project
    path: dev/api
    # recursive: true
    # secrets:
    #   - DATABASE_URL
    #   - REDIS_URL
    # map:
    #   DATABASE_URL: APP_DATABASE_URL

  production:
    # organization: acme
    vault: my-project
    group: prod-config
    # recursive: true
`;
}
