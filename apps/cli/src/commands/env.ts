import { writeFileSync } from "node:fs";
import { Command } from "commander";
import { requireActiveVault, resolveGroup } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { loadProjectConfig, resolveConfigPath, resolveEnvironmentConfig, validateProjectConfig } from "../lib/config.js";
import { buildInjectedEnvVars, serializeEnvVars, type ExportFormat } from "../lib/env-utils.js";
import { getAccessibleGroupChildren } from "../lib/resource-resolver.js";
import * as authStore from "../lib/auth-store.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

export const envCommand = new Command("env").description("Environment-friendly interface over groups");

// ── env list ──────────────────────────────────────────────────────────────────

envCommand
  .command("list")
  .description("List available environments")
  .action(() =>
    runCommand(async () => {
      requireAuth();

      const config = loadProjectConfig();

      if (config?.environments && Object.keys(config.environments).length > 0) {
        const envs = Object.entries(config.environments);
        renderData({ source: ".hermit.yml", environments: envs.map(([name, env]) => ({ name, group: env.group || env.path })) });
        const items: ui.TreeListingItem[] = envs.map(([name, env]) => ({
          id: env.group || env.path || name,
          name,
          isGroup: true,
          meta: env.group ? `group: ${env.group}` : env.path ? `path: ${env.path}` : undefined,
        }));
        ui.treeListing("Environments (from .hermit.yml)", items);
        return;
      }

      const vault = await requireActiveVault();
      const groups = await getAccessibleGroupChildren(vault.id, null);
      renderData({ source: "vault", vault, environments: groups });

      if (groups.length === 0) {
        ui.warn("No environments found");
        ui.newline();
        return;
      }

      const items: ui.TreeListingItem[] = groups.map((group) => ({
        id: group.id,
        name: group.name,
        isGroup: true,
        meta: `${group._count?.secrets ?? 0} secrets`,
      }));
      ui.treeListing(`Environments (from vault: ${vault.name})`, items);
    }),
  );

// ── env show ──────────────────────────────────────────────────────────────────

envCommand
  .command("show")
  .description("Show details for an environment")
  .argument("<name>", "Environment name")
  .action((name: string) =>
    runCommand(async () => {
      requireAuth();

      const config = loadProjectConfig();
      const vault = await requireActiveVault();

      if (config?.environments?.[name]) {
        const envConfig = resolveEnvironmentConfig(config, name);
        const groupQuery = envConfig.group || envConfig.path;

        const rows: ui.PanelRow[] = [
          ui.kv("Name", ui.colors.bright(name)),
          ui.kv("Vault", envConfig.vault || config.vault || "(default)"),
        ];

        if (envConfig.group) rows.push(ui.kv("Group", envConfig.group));
        if (envConfig.path) rows.push(ui.kv("Path", envConfig.path));
        if (envConfig.recursive !== undefined) rows.push(ui.kv("Recursive", String(envConfig.recursive)));
        if (envConfig.secrets?.length) rows.push(ui.kv("Secrets", envConfig.secrets.join(", ")));
        if (envConfig.map) rows.push(ui.kv("Map", Object.entries(envConfig.map).map(([k, v]) => `${k} -> ${v}`).join(", ")));

        if (groupQuery) {
          try {
            const group = await resolveGroup(vault.id, groupQuery);
            if (group) {
              rows.push(ui.spacer());
              rows.push(ui.kv("Group ID", ui.formatShortId(group.id)));
              rows.push(ui.kv("Group Name", ui.colors.primary(group.name)));
              rows.push(ui.kv("Secrets", String(group._count?.secrets ?? 0)));
            }
          } catch {
            rows.push(ui.spacer());
            rows.push(ui.text(ui.colors.amber(`Could not resolve group "${groupQuery}" server-side`)));
          }
        }

        renderData({ name, config: envConfig });
        ui.panel(`Environment: ${name}`, rows);
        ui.newline();
        return;
      }

      // Fallback: direct group lookup
      const group = await resolveGroup(vault.id, name);
      if (!group) {
        abort(`No environment or group matches "${name}".`);
      }

      renderData({ name, group });
      ui.panel(`Environment: ${name}`, [
        ui.kv("Name", ui.colors.bright(group.name)),
        ui.kv("Group ID", ui.formatShortId(group.id)),
        ui.kv("Vault", ui.colors.primary(vault.name)),
        ui.kv("Secrets", String(group._count?.secrets ?? 0)),
        ui.kv("Children", String(group._count?.children ?? 0)),
      ]);
      ui.newline();
    }),
  );

// ── env use ───────────────────────────────────────────────────────────────────

envCommand
  .command("use")
  .description("Set the active environment")
  .argument("<name>", "Environment name")
  .action((name: string) =>
    runCommand(async () => {
      requireAuth();

      const config = loadProjectConfig();
      const vault = await requireActiveVault();
      let groupQuery = name;

      // Config-first resolution
      if (config?.environments?.[name]) {
        const envConfig = resolveEnvironmentConfig(config, name);
        groupQuery = envConfig.group || envConfig.path || name;
      }

      // Resolve group server-side
      const group = await resolveGroup(vault.id, groupQuery);
      if (!group) {
        abort(`No group matches "${groupQuery}".`);
      }

      authStore.saveGroup({ id: group.id, name: group.name });
      renderData({ group });
      ui.success(`Active environment set to "${group.name}"`);
      ui.newline();
    }),
  );

// ── env create ────────────────────────────────────────────────────────────────

envCommand
  .command("create")
  .description("Create a new root-level environment (group). Use --save to add to .hermit.yml (not yet implemented).")
  .argument("<name>", "Environment name")
  .action((name: string) =>
    runCommand(async () => {
      requireAuth();

      if (name.includes("/")) {
        abort("Environment names cannot contain '/'. For nested groups, use `hermit group create`.", {
          suggestions: ["Run: hermit group create --path <path>"],
        });
      }

      const vault = await requireActiveVault();
      const group = await sdk.createGroup({
        vaultId: vault.id,
        name: name.trim(),
        parentId: undefined,
      });

      renderData({ group });
      ui.success(`Environment "${group.name}" created`);
      ui.newline();
    }),
  );

// ── env pull ──────────────────────────────────────────────────────────────────

interface EnvPullOptions {
  out?: string;
}

envCommand
  .command("pull")
  .description("Pull secrets as dotenv to stdout (or a file with --out)")
  .argument("[name]", "Environment name (defaults to active group)")
  .option("--out <file>", "Write to file instead of stdout")
  .action((name: string | undefined, opts: EnvPullOptions) =>
    runCommand(async () => {
      requireAuth();

      const vault = await requireActiveVault();
      let groupId: string | undefined;

      if (name) {
        const config = loadProjectConfig();
        let groupQuery = name;
        if (config?.environments?.[name]) {
          const envConfig = resolveEnvironmentConfig(config, name);
          groupQuery = envConfig.group || envConfig.path || name;
        }
        const group = await resolveGroup(vault.id, groupQuery);
        if (!group) {
          abort(`No group matches "${groupQuery}".`);
        }
        groupId = group.id;
      } else {
        const activeGroup = authStore.getGroup();
        if (!activeGroup) {
          abort("No active environment. Specify a name or run `hermit env use <name>` first.");
        }
        groupId = activeGroup.id;
      }

      const result = await sdk.bulkRevealSecretsCli({
        vaultId: vault.id,
        groupId,
        includeDescendants: true,
      });

      const envVars = buildInjectedEnvVars(result.secrets);
      const output = serializeEnvVars(envVars, "dotenv");

      if (opts.out) {
        writeFileSync(opts.out, output, "utf8");
        renderData({ file: opts.out, count: result.count });
        ui.success(`Wrote ${result.count} secrets to ${opts.out}`);
        ui.newline();
      } else {
        renderData({ secrets: result.secrets, count: result.count });
        process.stdout.write(output);
      }
    }),
  );

// ── env export ────────────────────────────────────────────────────────────────

interface EnvExportOptions {
  format: ExportFormat;
  output?: string;
}

envCommand
  .command("export")
  .description("Export secrets in a specified format")
  .argument("<name>", "Environment name")
  .option("--format <format>", "Output format: dotenv, json, yaml, shell", "dotenv")
  .option("--output <file>", "Write to file instead of stdout")
  .action((name: string, opts: EnvExportOptions) =>
    runCommand(async () => {
      requireAuth();

      const validFormats: ExportFormat[] = ["dotenv", "json", "yaml", "shell"];
      if (!validFormats.includes(opts.format)) {
        abort(`Invalid format "${opts.format}".`, { suggestions: [`Valid formats: ${validFormats.join(", ")}`] });
      }

      const vault = await requireActiveVault();
      const config = loadProjectConfig();
      let groupQuery = name;
      let configMap: Record<string, string> | undefined;

      if (config?.environments?.[name]) {
        const envConfig = resolveEnvironmentConfig(config, name);
        groupQuery = envConfig.group || envConfig.path || name;
        configMap = envConfig.map;
      }

      const group = await resolveGroup(vault.id, groupQuery);
      if (!group) {
        abort(`No group matches "${groupQuery}".`);
      }

      const result = await sdk.bulkRevealSecretsCli({
        vaultId: vault.id,
        groupId: group.id,
        includeDescendants: true,
      });

      const envVars = buildInjectedEnvVars(result.secrets, configMap);
      const output = serializeEnvVars(envVars, opts.format);

      if (opts.output) {
        writeFileSync(opts.output, output, "utf8");
        renderData({ file: opts.output, format: opts.format, count: result.count });
        ui.success(`Exported ${result.count} secrets to ${opts.output} (${opts.format})`);
        ui.newline();
      } else {
        renderData({ format: opts.format, secrets: result.secrets, count: result.count });
        process.stdout.write(output);
      }
    }),
  );

// ── env doctor ────────────────────────────────────────────────────────────────

envCommand
  .command("doctor")
  .description("Run diagnostic checks for an environment")
  .argument("[name]", "Environment name (defaults to active group)")
  .action((name: string | undefined) =>
    runCommand(async () => {
      const checks: ui.PanelRow[] = [];
      let allPassed = true;

      const pass = (label: string) => {
        checks.push(ui.text(`${ui.colors.green("PASS")}  ${label}`));
      };
      const fail = (label: string, detail?: string) => {
        allPassed = false;
        checks.push(ui.text(`${ui.colors.red("FAIL")}  ${label}`));
        if (detail) checks.push(ui.text(`       ${ui.colors.dim(detail)}`, { indent: 2 }));
      };

      // Check 1: Auth
      if (authStore.isAuthenticated()) {
        pass("Authenticated");
      } else {
        fail("Authenticated", "Run: hermit auth login");
        renderData({ checks: [{ name: "auth", passed: false }] });
        ui.panel("Environment Doctor", checks);
        ui.newline();
        return;
      }

      // Check 2: Config
      const configPath = resolveConfigPath();
      const config = loadProjectConfig();
      if (configPath) {
        pass(`.hermit.yml found at ${configPath}`);
        if (config) {
          const validation = validateProjectConfig(config);
          if (validation.valid) {
            pass(".hermit.yml is valid");
          } else {
            fail(".hermit.yml validation errors", validation.errors.join("; "));
          }
        }
      } else {
        checks.push(ui.text(`${ui.colors.amber("SKIP")}  No .hermit.yml found`));
      }

      // Check 3: Vault reachable
      let vault: sdk.VaultSummary | undefined;
      try {
        vault = await requireActiveVault();
        pass(`Vault reachable: ${vault.name}`);
      } catch {
        fail("Vault reachable", "No active vault or vault not accessible");
      }

      if (!vault) {
        renderData({ checks });
        ui.panel("Environment Doctor", checks);
        ui.newline();
        return;
      }

      // Check 4: Group exists
      let groupId: string | undefined;
      const envName = name;

      if (envName && config?.environments?.[envName]) {
        const envConfig = resolveEnvironmentConfig(config, envName);
        const groupQuery = envConfig.group || envConfig.path;
        if (groupQuery) {
          try {
            const group = await resolveGroup(vault.id, groupQuery);
            if (group) {
              pass(`Group resolved: ${group.name}`);
              groupId = group.id;
            } else {
              fail(`Group "${groupQuery}" not found`);
            }
          } catch (err) {
            fail(`Group "${groupQuery}"`, err instanceof Error ? err.message : String(err));
          }
        }
      } else if (envName) {
        try {
          const group = await resolveGroup(vault.id, envName);
          if (group) {
            pass(`Group resolved: ${group.name}`);
            groupId = group.id;
          } else {
            fail(`Group "${envName}" not found`);
          }
        } catch (err) {
          fail(`Group "${envName}"`, err instanceof Error ? err.message : String(err));
        }
      } else {
        const activeGroup = authStore.getGroup();
        if (activeGroup) {
          pass(`Active group: ${activeGroup.name}`);
          groupId = activeGroup.id;
        } else {
          checks.push(ui.text(`${ui.colors.amber("SKIP")}  No active group set`));
        }
      }

      // Check 5: Secrets resolvable
      if (groupId) {
        try {
          const secrets = await sdk.getSecrets(vault.id, { groupId, limit: 1, cliScope: true });
          pass(`Secrets accessible (${secrets.length > 0 ? "found" : "none found"})`);
        } catch (err) {
          fail("Secrets accessible", err instanceof Error ? err.message : String(err));
        }
      }

      renderData({ passed: allPassed });
      ui.panel("Environment Doctor", checks);
      ui.newline();
    }),
  );
