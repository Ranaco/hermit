import { Command } from "commander";
import { resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand as executeCommand } from "../lib/command-helpers.js";
import { loadProjectConfig, resolveEnvironmentConfig } from "../lib/config.js";
import { runWithEnv } from "../lib/process-runner.js";
import { setRuntimeState } from "../lib/runtime.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

interface RunOptions {
  vault?: string;
  org?: string;
  group?: string;
  path?: string;
  secret?: string;
  inject?: string;
  env?: string;
  config?: string;
  password?: string;
  vaultPassword?: string;
}

interface GroupTreeNode {
  group: sdk.SecretGroupSummary;
  path: string;
}

interface SecretMatch {
  secret: sdk.SecretSummary;
  path: string;
}

interface RunSelection {
  group?: sdk.SecretGroupSummary;
  includeDescendants?: boolean;
  secretIds?: string[];
  targetLabel: string;
}

const SECRET_LOOKUP_LIMIT = 200;

async function collectAccessibleGroupTree(
  vaultId: string,
  parentId?: string,
  pathPrefix = "",
): Promise<GroupTreeNode[]> {
  const groups = await sdk.getSecretGroups(vaultId, parentId ? { parentId } : {});
  const nodes: GroupTreeNode[] = [];

  for (const group of groups) {
    const path = pathPrefix ? `${pathPrefix}/${group.name}` : group.name;
    nodes.push({ group, path });
    nodes.push(...await collectAccessibleGroupTree(vaultId, group.id, path));
  }

  return nodes;
}

async function findExactSecretsInGroup(
  vaultId: string,
  groupId: string | undefined,
  query: string,
): Promise<sdk.SecretSummary[]> {
  const nameSearch = await sdk.getSecrets(vaultId, {
    secretGroupId: groupId,
    search: query,
    limit: SECRET_LOOKUP_LIMIT,
  });

  const exactName = nameSearch.filter((s) => s.name.toLowerCase() === query.toLowerCase());
  if (exactName.length > 0) return exactName;

  // No name match — try ID prefix lookup
  const all = await sdk.getSecrets(vaultId, { secretGroupId: groupId, limit: SECRET_LOOKUP_LIMIT });
  const exactId = all.filter((s) => s.id === query);
  if (exactId.length > 0) return exactId;

  return all.filter((s) => s.id.startsWith(query));
}

async function findAccessibleSecretMatches(
  vaultId: string,
  secretName: string,
  scope?: {
    group?: sdk.SecretGroupSummary;
    includeDescendants?: boolean;
  },
): Promise<SecretMatch[]> {
  const matches: SecretMatch[] = [];

  if (!scope?.group) {
    const rootSecrets = await findExactSecretsInGroup(vaultId, undefined, secretName);
    matches.push(...rootSecrets.map((secret) => ({ secret, path: secret.name })));

    const groups = await collectAccessibleGroupTree(vaultId);
    for (const node of groups) {
      const secrets = await findExactSecretsInGroup(vaultId, node.group.id, secretName);
      matches.push(...secrets.map((secret) => ({ secret, path: `${node.path}/${secret.name}` })));
    }

    return matches;
  }

  const scopedNodes: GroupTreeNode[] = [
    {
      group: scope.group,
      path: scope.group.name,
    },
  ];

  if (scope.includeDescendants) {
    scopedNodes.push(...await collectAccessibleGroupTree(vaultId, scope.group.id, scope.group.name));
  }

  for (const node of scopedNodes) {
    const secrets = await findExactSecretsInGroup(vaultId, node.group.id, secretName);
    matches.push(...secrets.map((secret) => ({ secret, path: `${node.path}/${secret.name}` })));
  }

  return matches;
}

function abortForAmbiguousSecret(secretName: string, matches: SecretMatch[]): never {
  abort(`Multiple accessible secrets named "${secretName}" matched the current selection.`, {
    suggestions: ["Use `hermit run --inject <folder/path/secret> -- <command>` to target one secret."],
    details: {
      matches: matches.map((match) => match.path),
    },
  });
}

async function resolveSingleSecretSelection(
  vaultId: string,
  secretName: string,
  scope?: {
    group?: sdk.SecretGroupSummary;
    includeDescendants?: boolean;
  },
): Promise<RunSelection> {
  const matches = await findAccessibleSecretMatches(vaultId, secretName, scope);

  if (matches.length === 0) {
    abort(`No accessible secret named "${secretName}" matched the current selection.`);
  }

  if (matches.length > 1) {
    abortForAmbiguousSecret(secretName, matches);
  }

  return {
    group: scope?.group,
    secretIds: [matches[0].secret.id],
    targetLabel: matches[0].path,
  };
}

async function resolveInjectSelection(vaultId: string, target: string): Promise<RunSelection> {
  if (!target.includes("/")) {
    abort("Inject targets without a path are ambiguous.", {
      suggestions: [
        "Use `--group <folder>` for a folder target.",
        "Use `--secret <name>` for a single secret target.",
        "Use `--inject <folder/path/secret>` for a full path target.",
      ],
    });
  }

  try {
    const group = await resolveGroupByPath(vaultId, target);
    return {
      group,
      includeDescendants: true,
      targetLabel: target,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("No secret group path matches")) {
      throw error;
    }

    const segments = target.split("/").map((segment) => segment.trim()).filter(Boolean);
    if (segments.length < 2) {
      abort(`No accessible inject target matches "${target}".`);
    }

    const secretName = segments.pop()!;
    const parentPath = segments.join("/");
    const group = await resolveGroupByPath(vaultId, parentPath);
    const matches = await findExactSecretsInGroup(vaultId, group.id, secretName);

    if (matches.length === 0) {
      abort(`No accessible secret matches "${target}".`);
    }

    if (matches.length > 1) {
      abortForAmbiguousSecret(secretName, matches.map((secret) => ({
        secret,
        path: `${parentPath}/${secret.name}`,
      })));
    }

    return {
      group,
      secretIds: [matches[0].id],
      targetLabel: `${parentPath}/${matches[0].name}`,
    };
  }
}

function parseMultilineSecret(value: string): Array<{ key: string; value: string }> {
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

function buildInjectedEnvVars(
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
      // Fall through to single-var injection if no key=value pairs found (e.g. certificates, SSH keys)
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

export const runCommand = new Command("run")
  .description("Run a command with real-time Hermit secrets injected into the child process environment")
  .option("--vault <query>", "Vault name or id")
  .option("--org <query>", "Organization name or id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("--secret <name>", "Inject only one secret by name")
  .option("-i, --inject <target>", "Inject a folder path or a full folder/secret path")
  .option("--env <name>", "Environment from .hermit.yml")
  .option("--config <path>", "Path to .hermit.yml")
  .option("--password <password>", "Secret-level password used for protected secrets")
  .option("--vault-password <password>", "Vault password used for protected vaults")
  .argument("[injectPath]", "Group path to inject (e.g. prod/api) — shorthand for --inject")
  .argument("[command...]", "Command to run")
  .allowExcessArguments(true)
  .action((injectPathArg: string | undefined, commandArgs: string[], opts: RunOptions) =>
    executeCommand(async () => {
      requireAuth();

      // Positional path shorthand: `hermit run prod/api -- npm run dev`
      // Only applied when no explicit injection flags are set.
      // When flags ARE set, restore the positional as the first command word.
      if (injectPathArg) {
        if (!opts.inject && !opts.group && !opts.path && !opts.secret && !opts.env) {
          opts.inject = injectPathArg;
        } else {
          commandArgs = [injectPathArg, ...commandArgs];
        }
      }

      if (opts.inject && opts.group) {
        abort("`--inject` cannot be combined with `--group`.", {
          suggestions: ["Use `--inject <folder/path>` or `--group <folder>`, not both."],
        });
      }

      const dashDash = process.argv.indexOf("--");
      const finalArgs = commandArgs.length > 0 ? commandArgs : dashDash >= 0 ? process.argv.slice(dashDash + 1) : [];
      if (finalArgs.length === 0) {
        abort("No command specified.", {
          suggestions: ["Usage: hermit run --inject prod/api -- npm run dev"],
        });
      }

      let configOrganization = opts.org;
      let configVault = opts.vault;
      let configGroup = opts.group;
      let configPath = opts.path;
      let configSecrets: string[] | undefined;
      let configMap: Record<string, string> | undefined;
      let configRecursive: boolean | undefined;

      if (opts.env) {
        const config = loadProjectConfig(opts.config);
        const environment = resolveEnvironmentConfig(config, opts.env);
        setRuntimeState({ serverUrlOverride: config?.server || undefined });
        configOrganization = configOrganization || environment.organization;
        configVault = configVault || environment.vault;
        configGroup = configGroup || environment.group;
        configPath = configPath || environment.path;
        configSecrets = environment.secrets;
        configMap = environment.map;
        configRecursive = environment.recursive;
      }

      const vault = await resolveVault(configVault, { organizationQuery: configOrganization });
      const pathQuery = opts.inject ? undefined : configPath;
      const groupQuery = opts.inject ? undefined : configGroup;
      const scopedGroup = pathQuery
        ? await resolveGroupByPath(vault.id, pathQuery)
        : await resolveGroup(vault.id, groupQuery);

      let selection: RunSelection;
      if (opts.inject) {
        selection = await resolveInjectSelection(vault.id, opts.inject);
      } else if (opts.secret) {
        const secretScopeRecursive = scopedGroup
          ? (opts.path || opts.group ? true : configRecursive ?? true)
          : false;
        selection = await resolveSingleSecretSelection(vault.id, opts.secret, {
          group: scopedGroup,
          includeDescendants: secretScopeRecursive,
        });
      } else if (scopedGroup) {
        const folderSelectionRecursive = opts.path || opts.group ? true : configRecursive ?? true;
        selection = {
          group: scopedGroup,
          includeDescendants: folderSelectionRecursive,
          targetLabel: pathQuery || scopedGroup.name,
        };
      } else {
        selection = {
          targetLabel: vault.name,
        };
      }

      const result = await sdk.bulkRevealSecrets({
        vaultId: vault.id,
        secretGroupId: selection.secretIds ? undefined : selection.group?.id,
        secretIds: selection.secretIds,
        includeDescendants: selection.includeDescendants,
        password: opts.password,
        vaultPassword: opts.vaultPassword,
      });

      if (result.error) {
        abort(result.error.message, { details: result.error });
      }

      let revealedSecrets = result.secrets;
      const shouldApplyConfigSecretFilter = !opts.inject && !opts.secret && !!configSecrets?.length;
      if (shouldApplyConfigSecretFilter) {
        const allowed = new Set((configSecrets || []).map((item) => item.toLowerCase()));
        revealedSecrets = revealedSecrets.filter((secret) => allowed.has(secret.name.toLowerCase()));
      }

      if (revealedSecrets.length === 0) {
        abort("No injectable secrets matched the current selection.");
      }

      const envVars = buildInjectedEnvVars(revealedSecrets, configMap);

      renderData({
        vault,
        group: selection.group,
        target: selection.targetLabel,
        injected: Object.keys(envVars),
        skipped: result.skipped,
      });

      ui.panel("Environment Injection", [
        ui.kv("Target", ui.colors.primary(selection.targetLabel), { overflow: "truncate" }),
        ui.kv("Injecting", ui.colors.bright(String(Object.keys(envVars).length))),
        ...Object.keys(envVars)
          .slice(0, 5)
          .map((name) => ui.kv(name, ui.formatSecretValue("masked", "masked"), { overflow: "truncate" })),
        ...(result.skipped.length ? [ui.kv("Skipped", ui.colors.primary(String(result.skipped.length)))] : []),
      ]);
      ui.info(`Starting: ${finalArgs.join(" ")}`);
      ui.newline();

      const [command, ...args] = finalArgs;
      const exitCode = await runWithEnv(command, args, envVars);
      process.exit(exitCode);
    }),
  );
