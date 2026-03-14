import { Command } from "commander";
import { requireActiveVault, resolveKey, resolveVault } from "../lib/context.js";
import { renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptConfirm, promptInput, promptSelect } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
import { isNonInteractive } from "../lib/runtime.js";

const valueTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;

type ValueType = (typeof valueTypes)[number];

interface KeyListOptions {
  vault?: string;
}

interface KeyCreateOptions {
  vault?: string;
  name?: string;
  description?: string;
  type?: ValueType;
}

interface DeleteOptions {
  yes?: boolean;
}

export const keyCommand = new Command("key").description("Manage encryption keys");

keyCommand
  .command("list")
  .description("List keys in a vault")
  .option("--vault <query>", "Vault name or id")
  .action((opts: KeyListOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = await resolveVault(opts.vault);
      const keys = await sdk.getKeys(vault.id);
      renderData({ vault, keys });
      if (keys.length === 0) {
        ui.warn("No keys found");
        ui.newline();
        return;
      }
      ui.cards(
        keys.map((key) => ({
          id: key.id,
          name: key.name,
          fields: [
            { label: "Type", value: key.valueType || "STRING", overflow: "truncate" },
            { label: "Versions", value: String(key._count?.versions || key.versions?.length || 1), overflow: "truncate" },
          ],
        })),
      );
    }),
  );

keyCommand
  .command("create")
  .description("Create a key")
  .option("--vault <query>", "Vault name or id")
  .option("-n, --name <name>", "Key name")
  .option("-d, --description <description>", "Description")
  .option("-t, --type <type>", "Value type")
  .action((opts: KeyCreateOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = await resolveVault(opts.vault);
      const name =
        opts.name ||
        (await promptInput(
          { message: "Key name:", validate: (value: string) => (value.trim() ? true : "Name is required") },
          "Key name is required in non-interactive mode.",
        ));
      const description =
        opts.description ??
        (!isNonInteractive()
          ? await promptInput({ message: "Description (optional):" }, "")
          : undefined);
      const valueType =
        opts.type ||
        (isNonInteractive()
          ? "STRING"
          : await promptSelect<ValueType>(
              {
                message: "Key type:",
                choices: valueTypes.map((type) => ({ name: type, value: type })),
              },
              "Key type is required in non-interactive mode.",
            ));

      const key = await sdk.createKey({
        name: name.trim(),
        description: description?.trim() || undefined,
        vaultId: vault.id,
        valueType,
      });
      renderData({ key });
      ui.success(`Key "${key.name}" created`);
      ui.newline();
    }),
  );

keyCommand
  .command("get")
  .description("Show a key by id, short id, or name")
  .argument("<query>", "Key id, short id prefix, or name")
  .action((query: string) =>
    runCommand(async () => {
      requireAuth();
      const vault = await requireActiveVault();
      const key = await resolveKey(vault.id, query);
      renderData({ key });
      ui.panel("Key", [
        ui.kv("Name", ui.colors.primary(key.name), { overflow: "truncate" }),
        ui.kv("ID", ui.colors.cyan(key.id), { overflow: "truncate" }),
        ui.kv("Type", ui.colors.primary(key.valueType || "STRING"), { overflow: "truncate" }),
      ]);
      ui.newline();
    }),
  );

keyCommand
  .command("rotate")
  .description("Rotate a key")
  .argument("<query>", "Key id, short id prefix, or name")
  .action((query: string) =>
    runCommand(async () => {
      requireAuth();
      const vault = await requireActiveVault();
      const key = await resolveKey(vault.id, query);
      const result = await sdk.rotateKey(key.id);
      renderData({ success: true, ...result });
      ui.success(`Key "${key.name}" rotated to version ${result.versionNumber}`);
      ui.newline();
    }),
  );

keyCommand
  .command("delete")
  .description("Delete a key")
  .argument("<query>", "Key id, short id prefix, or name")
  .option("-y, --yes", "Skip confirmation")
  .action((query: string, opts: DeleteOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = await requireActiveVault();
      const key = await resolveKey(vault.id, query);
      if (!opts.yes) {
        const confirmed = await promptConfirm(
          { message: `Delete key "${key.name}"?`, default: false },
          "Use --yes when deleting a key in non-interactive mode.",
        );
        if (!confirmed) {
          ui.warn("Cancelled");
          ui.newline();
          return;
        }
      }
      await sdk.deleteKey(key.id);
      renderData({ success: true, keyId: key.id });
      ui.success(`Key "${key.name}" deleted`);
      ui.newline();
    }),
  );
