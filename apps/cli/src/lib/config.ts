import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import { abort } from "./command-helpers.js";

export interface HermitEnvironment {
  organization?: string;
  vault?: string;
  team?: string;
  group?: string;
  path?: string;
  recursive?: boolean;
  secrets?: string[];
  map?: Record<string, string>;
}

export interface HermitConfig {
  version: number;
  server?: string;
  org?: string;
  vault?: string;
  default_env?: string;
  environments?: Record<string, HermitEnvironment>;
}

const CONFIG_FILENAMES = [".hermit.yml", ".hermit.yaml"];

export function resolveConfigPath(explicitPath?: string): string | null {
  if (explicitPath) {
    const resolved = resolve(explicitPath);
    return existsSync(resolved) ? resolved : null;
  }

  // Walk up directory tree to find .hermit.yml (like git looks for .git)
  let current = resolve(process.cwd());
  const root = resolve("/");
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = resolve(current, filename);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = dirname(current);
    if (parent === current || current === root) {
      break;
    }
    current = parent;
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
  if (config.environments && typeof config.environments === "object") {
    for (const [name, environment] of Object.entries(config.environments)) {
      if (!environment.vault && !config.vault) {
        errors.push(`Environment "${name}" must define a vault (or set vault at the top level).`);
      }
      if (environment.group && environment.path) {
        errors.push(`Environment "${name}" cannot define both group and path.`);
      }
      if (environment.recursive !== undefined && typeof environment.recursive !== "boolean") {
        errors.push(`Environment "${name}" recursive must be true or false.`);
      }
    }
    if (config.default_env && !config.environments[config.default_env]) {
      errors.push(`default_env "${config.default_env}" does not match any defined environment.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function resolveEnvironmentConfig(config: HermitConfig | null, environmentName?: string): HermitEnvironment {
  if (!config) {
    abort("No .hermit.yml found.", { suggestions: ["Run: hermit init"] });
  }
  const validation = validateProjectConfig(config);
  if (!validation.valid) {
    abort("Invalid .hermit.yml configuration.", { details: validation.errors });
  }
  const resolvedName = environmentName || config.default_env;
  if (!resolvedName) {
    abort("No environment specified and no default_env set in .hermit.yml.", {
      suggestions: [
        "Use `hermit run --env <name>` to pick an environment.",
        "Or set `default_env: <name>` in .hermit.yml.",
      ],
    });
  }
  const environment = config.environments?.[resolvedName];
  if (!environment) {
    abort(`Environment "${resolvedName}" not found.`, {
      details: { available: Object.keys(config.environments || {}) },
    });
  }
  // Inherit top-level org/vault if not set per-environment
  return {
    ...environment,
    organization: environment.organization || config.org,
    vault: environment.vault || config.vault,
  };
}

export interface GenerateTemplateOptions {
  org?: string;
  vault?: string;
  environments?: string[];
  defaultEnv?: string;
  server?: string;
}

export function generateTemplate(options?: GenerateTemplateOptions): string {
  const org = options?.org || "my-org";
  const vault = options?.vault || "my-vault";
  const envs = options?.environments || [];
  const defaultEnv = options?.defaultEnv || envs[0] || "dev";
  const server = options?.server;

  let content = `# Hermit CLI configuration
# Docs: https://hermit.dev/docs/cli

version: 1
${server ? `server: ${server}\n` : "# server: https://hermit.example.com/api/v1\n"}
org: ${org}
vault: ${vault}

# Default environment used when running \`hermit run\` without --env
default_env: ${defaultEnv}
`;

  if (envs.length > 0) {
    content += `
environments:
`;
    for (const env of envs) {
      content += `  ${env}:
    group: ${env}
`;
    }
  } else {
    content += `
# environments:
#   dev:
#     group: dev
#   staging:
#     group: staging
#   prod:
#     group: prod
`;
  }

  return content;
}
