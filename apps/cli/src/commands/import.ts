import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { requireActiveVault, resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { detectImportFormat, parseDotenv, parseJsonEnv, type ImportFormat } from "../lib/env-utils.js";
import { promptConfirm } from "../lib/prompts.js";
import { resolveSecretKeyId, type ValueType } from "../lib/secret-handlers.js";
import { isJsonMode, isNonInteractive } from "../lib/runtime.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

interface SecretImportOptions {
  vault?: string;
  group?: string;
  path?: string;
  format?: ImportFormat;
  type?: ValueType;
  overwrite?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

function inferValueType(value: string): ValueType {
  return value.includes("\n") ? "MULTILINE" : "STRING";
}

async function readImportSource(filePath: string): Promise<string> {
  if (filePath === "-") {
    if (process.stdin.isTTY) {
      abort("Use stdin piping with `-` or provide a file path.");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  try {
    return readFileSync(resolve(filePath), "utf-8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    abort(`Failed to read import file "${filePath}": ${message}`);
  }
}

export const secretImportCommand = new Command("import")
  .description("Import secrets from a dotenv file or JSON object")
  .argument("<file>", "Import file path or - for stdin")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Target group path like prod/api")
  .option("--format <fmt>", "Import format (dotenv or json)")
  .option("--type <type>", "Default value type for imported secrets")
  .option("--overwrite", "Update existing secrets instead of skipping them")
  .option("--dry-run", "Show what would be imported without making changes")
  .option("-y, --yes", "Skip confirmation")
  .action((filePath: string, opts: SecretImportOptions) =>
    runCommand(async () => {
      requireAuth();

      const sourceText = await readImportSource(filePath);
      const format = detectImportFormat(filePath, opts.format);
      const parsed = format === "json" ? parseJsonEnv(sourceText) : parseDotenv(sourceText);
      const entries = Object.entries(parsed);

      if (entries.length === 0) {
        abort("No secrets were found in the import source.");
      }

      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const targetLabel = group ? `${vault.name} / ${group.name}` : vault.name;
      const existingSecrets = await sdk.getSecrets(vault.id, {
        groupId: group?.id,
        cliScope: true,
      });
      const existingByName = new Map(existingSecrets.map((secret) => [secret.name.toLowerCase(), secret]));

      const preview = entries.map(([name, value]) => ({
        name,
        action: existingByName.has(name.toLowerCase()) ? (opts.overwrite ? "update" : "skip") : "create",
        valueType: opts.type || inferValueType(value),
      }));

      if (opts.dryRun) {
        renderData({
          success: true,
          dryRun: true,
          format,
          target: targetLabel,
          entries: preview,
        });
      }

      if (!isJsonMode()) {
        ui.panel("Secret Import", [
          ui.kv("Target", ui.colors.primary(targetLabel), { overflow: "wrap" }),
          ui.kv("Format", ui.colors.primary(format)),
          ui.kv("Entries", ui.colors.primary(String(entries.length))),
          ui.kv("Overwrite", ui.colors.primary(opts.overwrite ? "yes" : "no")),
          ui.kv("Dry run", ui.colors.primary(opts.dryRun ? "yes" : "no")),
        ]);
      }

      if (opts.dryRun) {
        ui.info("Dry run only. No secrets were changed.");
        ui.newline();
        return;
      }

      if (!opts.yes && !isNonInteractive()) {
        const confirmed = await promptConfirm(
          { message: `Import ${entries.length} secrets into "${targetLabel}"?`, default: false },
          "Use --yes when importing secrets in non-interactive mode.",
        );
        if (!confirmed) {
          ui.warn("Cancelled");
          ui.newline();
          return;
        }
      } else if (!opts.yes && isNonInteractive()) {
        abort("Use --yes when importing secrets in non-interactive mode.");
      }

      const keyId = await resolveSecretKeyId(vault.id);
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const [name, value] of entries) {
        const existing = existingByName.get(name.toLowerCase());
        const valueType = opts.type || inferValueType(value);

        if (existing) {
          if (!opts.overwrite) {
            skipped += 1;
            continue;
          }

          await sdk.updateSecret(existing.id, {
            value,
            valueType,
            groupId: group?.id || null,
          });
          updated += 1;
          continue;
        }

        await sdk.createSecret({
          name,
          value,
          vaultId: vault.id,
          keyId,
          valueType,
          groupId: group?.id,
        });
        created += 1;
      }

      renderData({
        success: true,
        target: targetLabel,
        created,
        updated,
        skipped,
      });

      ui.success(`Import complete: ${created} created, ${updated} updated, ${skipped} skipped`);
      ui.newline();
    }),
  );
