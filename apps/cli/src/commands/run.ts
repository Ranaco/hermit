import { Command } from "commander";
import { resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand as executeCommand } from "../lib/command-helpers.js";
import { loadProjectConfig, resolveEnvironmentConfig } from "../lib/config.js";
import { buildInjectedEnvVars } from "../lib/env-utils.js";
import { runWithEnv } from "../lib/process-runner.js";
import { findSecretCandidates, getAccessibleGroupTree, type GroupTreeNode } from "../lib/resource-resolver.js";
import { setRuntimeState } from "../lib/runtime.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

interface RunOptions {
  vault?: string;
  org?: string;
  group?: string;
  secret?: string;
  inject?: string;
  env?: string;
  config?: string;
  password?: string;
  vaultPassword?: string;
  dryRun?: boolean;
}

interface SecretMatch {
  secret: sdk.SecretSummary;
  path: string;
}

interface RunSelection {
  group?: sdk.GroupSummary;
  includeDescendants?: boolean;
  secretIds?: string[];
  targetLabel: string;
}

async function findAccessibleSecretMatches(
  vaultId: string,
  secretName: string,
  scope?: {
    group?: sdk.GroupSummary;
    includeDescendants?: boolean;
  },
): Promise<SecretMatch[]> {
  const matches: SecretMatch[] = [];

  if (!scope?.group) {
    const rootSecrets = await findSecretCandidates(vaultId, undefined, secretName);
    matches.push(...rootSecrets.map((secret) => ({ secret, path: secret.name })));

    const groups = await getAccessibleGroupTree(vaultId);
    for (const node of groups) {
      const secrets = await findSecretCandidates(vaultId, node.group.id, secretName);
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
    scopedNodes.push(...await getAccessibleGroupTree(vaultId, scope.group.id, scope.group.name));
  }

  for (const node of scopedNodes) {
    const secrets = await findSecretCandidates(vaultId, node.group.id, secretName);
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
    group?: sdk.GroupSummary;
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
    abort(`"${target}" is a single name — it is ambiguous as an inject target.`, {
      suggestions: [
        "Use `--group <name>` to inject all secrets in a named group.",
        "Use `--secret <name>` to inject a single secret by name.",
        "Use `--inject <folder/path>` or a positional path like `prod/api` for path-based injection.",
      ],
    });
  }

  // First try: treat the full target as a group path.
  try {
    const group = await resolveGroupByPath(vaultId, target);
    return {
      group,
      includeDescendants: true,
      targetLabel: target,
    };
  } catch {
    // Fall through: try treating the last segment as a secret name.
  }

  // Second try: treat the last segment as a secret name within the parent path.
  const segments = target.split("/").map((segment) => segment.trim()).filter(Boolean);
  const secretName = segments.pop()!;
  const parentPath = segments.join("/");

  let group: sdk.GroupSummary;
  try {
    group = await resolveGroupByPath(vaultId, parentPath);
  } catch {
    abort(`"${target}" did not match any group path or secret. Run \`hermit group tree\` to see available paths.`, {
      suggestions: [`hermit group tree`],
    });
  }

  const matches = await findSecretCandidates(vaultId, group.id, secretName);

  if (matches.length === 0) {
    abort(`No secret named "${secretName}" found in "${parentPath}". Run \`hermit secret list --path ${parentPath}\` to see available secrets.`, {
      suggestions: [`hermit secret list --path ${parentPath}`],
    });
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

export const runCommand = new Command("run")
  .description("Run a command with real-time Hermit secrets injected into the child process environment")
  .option("--vault <query>", "Vault name or id")
  .option("--org <query>", "Organization name or id")
  .option("--group <query>", "Group name or id (single-level lookup)")
  .option("--secret <name>", "Inject only one secret by name")
  .option("-i, --inject <target>", "Inject a folder path or a full folder/secret path (e.g. prod/api)")
  .option("--env <name>", "Environment from .hermit.yml, or group name if no config")
  .option("--config <path>", "Path to .hermit.yml")
  .option("--password <password>", "Secret-level password for protected secrets")
  .option("--vault-password <password>", "Vault password for protected vaults")
  .option("--dry-run", "Preview what would be injected without running the command")
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
        if (!opts.inject && !opts.group && !opts.secret && !opts.env) {
          opts.inject = injectPathArg;
        } else {
          commandArgs = [injectPathArg, ...commandArgs];
        }
      }

      if (opts.inject && opts.group) {
        abort("`--inject` cannot be combined with `--group`.", {
          suggestions: ["Use `--inject <folder/path>` for path-based injection, or `--group <name>` for name-based lookup."],
        });
      }

      const dashDash = process.argv.indexOf("--");
      const finalArgs = commandArgs.length > 0 ? commandArgs : dashDash >= 0 ? process.argv.slice(dashDash + 1) : [];
      if (finalArgs.length === 0 && !opts.dryRun) {
        abort("No command specified.", {
          suggestions: [
            "Usage: hermit run prod/api -- npm run dev",
            "Usage: hermit run --env development -- npm run dev",
            "Usage: hermit run --dry-run prod/api  (preview injection)",
          ],
        });
      }

      let configOrganization = opts.org;
      let configVault = opts.vault;
      let configGroup = opts.group;
      let configPath: string | undefined;
      let configSecrets: string[] | undefined;
      let configMap: Record<string, string> | undefined;
      let configRecursive: boolean | undefined;

      // Load .hermit.yml when --env is set, or when no explicit target is provided and a default_env exists.
      const shouldLoadConfig = opts.env || (!opts.inject && !opts.group && !opts.secret && !opts.vault);
      if (shouldLoadConfig) {
        const config = loadProjectConfig(opts.config);
        if (config && (opts.env || config.default_env)) {
          const environment = resolveEnvironmentConfig(config, opts.env);
          setRuntimeState({ serverUrlOverride: config?.server || undefined });
          configOrganization = configOrganization || environment.organization;
          configVault = configVault || environment.vault;
          configGroup = configGroup || environment.group;
          configPath = environment.path;
          configSecrets = environment.secrets;
          configMap = environment.map;
          configRecursive = environment.recursive;
        } else if (opts.env && !config) {
          // No .hermit.yml found — treat --env as a direct group name lookup
          configGroup = configGroup || opts.env;
        }
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
          ? (opts.group ? true : configRecursive ?? true)
          : false;
        selection = await resolveSingleSecretSelection(vault.id, opts.secret, {
          group: scopedGroup,
          includeDescendants: secretScopeRecursive,
        });
      } else if (scopedGroup) {
        const folderSelectionRecursive = opts.group ? true : configRecursive ?? true;
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

      const result = await sdk.bulkRevealSecretsCli({
        vaultId: vault.id,
        groupId: selection.secretIds ? undefined : selection.group?.id,
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

      if (opts.dryRun) {
        renderData({
          dryRun: true,
          vault: vault.name,
          target: selection.targetLabel,
          would_inject: Object.keys(envVars),
          skipped: result.skipped,
        });
        ui.panel("Dry Run — Environment Injection Preview", [
          ui.kv("Target", ui.colors.primary(selection.targetLabel), { overflow: "truncate" }),
          ui.kv("Would inject", ui.colors.bright(String(Object.keys(envVars).length))),
          ...Object.keys(envVars).map((name) => ui.kv(name, ui.formatSecretValue("masked", "masked"), { overflow: "truncate" })),
          ...(result.skipped.length ? [ui.kv("Skipped", ui.colors.primary(String(result.skipped.length)))] : []),
        ]);
        ui.newline();
        return;
      }

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
