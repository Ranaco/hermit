import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { requireActiveVault, resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, requireAuth, runCommand } from "../lib/command-helpers.js";
import { buildInjectedEnvVars, serializeEnvVars, type ExportFormat } from "../lib/env-utils.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

interface SecretExportOptions {
  vault?: string;
  group?: string;
  path?: string;
  format?: ExportFormat;
  output?: string;
  password?: string;
  vaultPassword?: string;
}

async function executeSecretExport(opts: SecretExportOptions): Promise<void> {
  requireAuth();

  const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
  const group = opts.path
    ? await resolveGroupByPath(vault.id, opts.path)
    : await resolveGroup(vault.id, opts.group);

  const result = await sdk.bulkRevealSecretsCli({
    vaultId: vault.id,
    secretGroupId: group?.id,
    includeDescendants: !!group,
    password: opts.password,
    vaultPassword: opts.vaultPassword,
  });

  if (result.error) {
    abort(result.error.message, { details: result.error });
  }

  if (result.secrets.length === 0) {
    abort("No secrets matched the current export selection.");
  }

  const envVars = buildInjectedEnvVars(result.secrets);
  const format = opts.format || "dotenv";
  const output = serializeEnvVars(envVars, format);

  if (opts.output) {
    writeFileSync(resolve(opts.output), output, "utf-8");
    ui.success(`Exported ${Object.keys(envVars).length} variables to ${opts.output}`);
    if (result.skipped.length > 0) {
      ui.warn(`${result.skipped.length} protected or inaccessible secrets were skipped`);
    }
    ui.newline();
    return;
  }

  process.stdout.write(output);
}

export const envCommand = new Command("env")
  .description("Export secrets as environment variables")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("--format <fmt>", "Export format (dotenv, shell, json, yaml)")
  .option("--output <file>", "Write output to a file instead of stdout")
  .option("--password <password>", "Secret-level password used for protected secrets")
  .option("--vault-password <password>", "Vault password used for protected vaults")
  .action((opts: SecretExportOptions) => runCommand(() => executeSecretExport(opts)));

export const secretExportCommand = new Command("export")
  .description("Export secrets as dotenv, shell, json, or yaml")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("--format <fmt>", "Export format (dotenv, shell, json, yaml)")
  .option("--output <file>", "Write output to a file instead of stdout")
  .option("--password <password>", "Secret-level password used for protected secrets")
  .option("--vault-password <password>", "Vault password used for protected vaults")
  .action((opts: SecretExportOptions) => runCommand(() => executeSecretExport(opts)));
