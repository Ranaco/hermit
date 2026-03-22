import { abort } from "./command-helpers.js";

export type ExportFormat = "dotenv" | "shell" | "json" | "yaml";
export type ImportFormat = "dotenv" | "json";

export function parseMultilineSecret(value: string): Array<{ key: string; value: string }> {
  const pairs: Array<{ key: string; value: string }> = [];
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eqIndex + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    pairs.push({ key, value: val });
  }
  return pairs;
}

export function buildInjectedEnvVars(
  revealedSecrets: Array<{ name: string; value: string; valueType?: string }>,
  configMap?: Record<string, string>,
): Record<string, string> {
  const envVars: Record<string, string> = {};
  const assignedNames = new Map<string, string>();
  const collisions = new Map<string, string[]>();

  for (const secret of revealedSecrets) {
    if ((secret.valueType ?? "").toUpperCase() === "MULTILINE" || secret.value.includes("\n")) {
      const pairs = parseMultilineSecret(secret.value);
      if (pairs.length > 0) {
        for (const { key, value } of pairs) {
          const envName = configMap?.[key] || key;
          const existingSource = assignedNames.get(envName);
          if (existingSource && !existingSource.startsWith(`${secret.name}:`)) {
            const current = collisions.get(envName) || [];
            if (current.length === 0) current.push(existingSource);
            current.push(`${secret.name}:${key}`);
            collisions.set(envName, current);
            continue;
          }
          envVars[envName] = value;
          assignedNames.set(envName, `${secret.name}:${key}`);
        }
        continue;
      }
    }

    const envName = configMap?.[secret.name] || secret.name;
    const existingSource = assignedNames.get(envName);
    if (existingSource && existingSource !== secret.name) {
      const current = collisions.get(envName) || [];
      if (current.length === 0) {
        current.push(existingSource);
      }
      current.push(secret.name);
      collisions.set(envName, current);
      continue;
    }

    envVars[envName] = secret.value;
    assignedNames.set(envName, secret.name);
  }

  if (collisions.size > 0) {
    abort("Injected environment variable names collided.", {
      suggestions: ["Use `.hermit.yml` `map` entries to assign unique environment variable names."],
      details: {
        collisions: Array.from(collisions.entries()).map(([envName, names]) => ({
          envName,
          sources: names,
        })),
      },
    });
  }

  return envVars;
}

function escapeDoubleQuoted(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/"/g, '\\"');
}

function formatDotenvValue(value: string): string {
  if (value === "") {
    return '""';
  }
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }
  return `"${escapeDoubleQuoted(value)}"`;
}

function formatShellValue(value: string): string {
  return `"${escapeDoubleQuoted(value)}"`;
}

function formatYamlValue(value: string): string {
  if (value === "") {
    return '""';
  }

  if (!value.includes("\n") && /^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

export function serializeEnvVars(envVars: Record<string, string>, format: ExportFormat): string {
  switch (format) {
    case "json":
      return `${JSON.stringify(envVars, null, 2)}\n`;
    case "yaml":
      return `${Object.entries(envVars)
        .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
        .join("\n")}\n`;
    case "shell":
      return `${Object.entries(envVars)
        .map(([key, value]) => `export ${key}=${formatShellValue(value)}`)
        .join("\n")}\n`;
    case "dotenv":
    default:
      return `${Object.entries(envVars)
        .map(([key, value]) => `${key}=${formatDotenvValue(value)}`)
        .join("\n")}\n`;
  }
}

export function parseDotenv(text: string): Record<string, string> {
  const envVars: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIndex = normalized.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    let value = normalized.slice(eqIndex + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    value = value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

    envVars[key] = value;
  }

  return envVars;
}

export function parseJsonEnv(text: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    abort(`Failed to parse JSON import: ${message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    abort("JSON import must be a flat object of key/value pairs.");
  }

  const envVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      abort(`Invalid environment variable name "${key}" in import.`);
    }
    if (typeof value === "string") {
      envVars[key] = value;
      continue;
    }
    if (value === null || typeof value === "number" || typeof value === "boolean") {
      envVars[key] = String(value);
      continue;
    }
    abort(`JSON import value for "${key}" must be a string, number, boolean, or null.`);
  }

  return envVars;
}

export function detectImportFormat(filePath: string, explicitFormat?: ImportFormat): ImportFormat {
  if (explicitFormat) {
    return explicitFormat;
  }
  return filePath.toLowerCase().endsWith(".json") ? "json" : "dotenv";
}
