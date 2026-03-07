import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { abort } from "./command-helpers.js";

export interface HermesEnvironment {
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

const CONFIG_FILENAMES = [".hermes.yml", ".hermes.yaml"];

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

export function loadProjectConfig(explicitPath?: string): HermesConfig | null {
  const path = resolveConfigPath(explicitPath);
  if (!path) {
    return null;
  }
  const parsed = parse(readFileSync(path, "utf8")) as HermesConfig;
  return parsed;
}

export function validateProjectConfig(config: HermesConfig): { valid: boolean; errors: string[] } {
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
    }
  }
  return { valid: errors.length === 0, errors };
}

export function resolveEnvironmentConfig(config: HermesConfig | null, environmentName: string): HermesEnvironment {
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

export function generateTemplate(): string {
  return `# Hermes CLI configuration
# Docs: https://hermes.dev/docs/cli

version: 1
# server: https://hermes.example.com/api/v1

environments:
  development:
    vault: my-project
    path: dev/api
    # secrets:
    #   - DATABASE_URL
    #   - REDIS_URL
    # map:
    #   DATABASE_URL: APP_DATABASE_URL

  production:
    vault: my-project
    group: prod-config
`;
}
