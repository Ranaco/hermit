import { Command } from "commander";
import { requireActiveVault, resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptConfirm, promptEditor, promptInput, promptPassword, promptSelect } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

const valueTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;

async function resolveKeyId(vaultId: string, requestedKeyId?: string): Promise<string> {
  if (requestedKeyId) return requestedKeyId;
  const keys = await sdk.getKeys(vaultId);
  if (keys.length === 0) {
    const key = await sdk.createKey({ name: "default-key", vaultId, valueType: "STRING" });
    return key.id;
  }
  if (keys.length === 1) return keys[0].id;
  return promptSelect(
    {
      message: "Select encryption key:",
      choices: keys.map((key) => ({ name: key.name, value: key.id })),
    },
    "Key id is required in non-interactive mode when multiple keys exist.",
  );
}

export const secretCommand = new Command("secret").description("Manage secrets");

secretCommand
  .command("list")
  .description("List secrets in a vault")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("--search <term>", "Search term")
  .action((opts) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: opts.search,
      });
      renderData({ vault, group, secrets });
      if (secrets.length === 0) {
        ui.warn("No secrets found");
        ui.newline();
        return;
      }
      ui.cards(
        secrets.map((secret) => ({
          id: secret.id,
          name: secret.name,
          badge: secret.hasPassword ? ui.formatBadge("protected", "warning") : undefined,
          fields: [
            { label: "Type", value: secret.valueType || "STRING", overflow: "truncate" },
            { label: "Version", value: `v${secret.currentVersion?.versionNumber || 1}`, overflow: "truncate" },
          ],
        })),
      );
    }),
  );

secretCommand
  .command("set")
  .description("Create or update a secret")
  .argument("[name]", "Secret name")
  .argument("[value]", "Secret value")
  .option("--vault <query>", "Vault name or id")
  .option("--key <id>", "Key id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("--type <type>", "Value type")
  .option("--description <description>", "Description")
  .option("--password", "Prompt for a secret password")
  .action((nameArg: string | undefined, valueArg: string | undefined, opts) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id });
      const name =
        nameArg ||
        (await promptInput(
          {
            message: "Secret name:",
            validate: (value) =>
              /^[a-zA-Z0-9-_. ]+$/.test(value) ? true : "Invalid secret name",
          },
          "Secret name is required in non-interactive mode.",
        ));

      const existing = secrets.find((secret) => secret.name.toLowerCase() === name.toLowerCase());
      const valueType =
        opts.type ||
        (await promptSelect(
          {
            message: "Secret type:",
            choices: valueTypes.map((type) => ({ name: type, value: type })),
          },
          "Secret type is required in non-interactive mode.",
        ));

      let value = valueArg;
      if (!value) {
        if (valueType === "MULTILINE") {
          value = await promptEditor({ message: "Secret value:" }, "Secret value is required in non-interactive mode.");
        } else if (valueType === "BOOLEAN") {
          const booleanValue = await promptSelect(
            {
              message: "Secret value:",
              choices: [
                { name: "true", value: "true" },
                { name: "false", value: "false" },
              ],
            },
            "Secret value is required in non-interactive mode.",
          );
          value = booleanValue;
        } else {
          value = await promptPassword({ message: "Secret value:" }, "Secret value is required in non-interactive mode.");
        }
      }

      let password: string | undefined;
      if (opts.password) {
        password = await promptPassword({ message: "Secret password:" }, "Secret password is required in non-interactive mode.");
        const confirmation = await promptPassword(
          { message: "Confirm secret password:" },
          "Secret password confirmation is required in non-interactive mode.",
        );
        if (password !== confirmation) {
          abort("Secret passwords do not match.");
        }
      }

      if (existing) {
        const result = await sdk.updateSecret(existing.id, {
          value,
          valueType,
          description: opts.description,
          password,
          secretGroupId: group?.id || null,
        });
        renderData({ secret: result.secret, mode: "updated" });
        ui.success(`Secret "${name}" updated`);
        ui.newline();
        return;
      }

      const keyId = await resolveKeyId(vault.id, opts.key);
      const result = await sdk.createSecret({
        name,
        value,
        vaultId: vault.id,
        keyId,
        valueType,
        secretGroupId: group?.id,
        password,
        description: opts.description,
      });
      renderData({ secret: result.secret, mode: "created" });
      ui.success(`Secret "${name}" created`);
      ui.newline();
    }),
  );

secretCommand
  .command("get")
  .description("Reveal a secret value")
  .argument("[name]", "Secret name")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("-c, --copy", "Copy to clipboard")
  .action((nameArg: string | undefined, opts) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id });
      if (secrets.length === 0) {
        abort("No secrets found.");
      }

      let secret = nameArg
        ? secrets.find((item) => item.name.toLowerCase() === nameArg.toLowerCase())
        : undefined;
      if (!secret) {
        const selected = await promptSelect(
          {
            message: "Select secret:",
            choices: secrets.map((item) => ({ name: item.name, value: item.id })),
          },
          "Secret name is required in non-interactive mode.",
        );
        secret = secrets.find((item) => item.id === selected);
      }

      if (!secret) {
        abort(`Secret "${nameArg}" not found.`);
      }

      let revealed: sdk.SecretRevealResult;
      try {
        revealed = await sdk.revealSecret(secret.id);
      } catch (error: unknown) {
        const apiError = error as { statusCode?: number };
        if (apiError.statusCode === 403) {
          const password = await promptPassword(
            { message: "Secret password:" },
            "Secret password is required in non-interactive mode.",
          );
          revealed = await sdk.revealSecret(secret.id, { password });
        } else {
          throw error;
        }
      }

      renderData(revealed);
      ui.panel(revealed.secret.name, [
        ui.kv("Value", ui.formatSecretValue(revealed.secret.value, "plain"), { overflow: "wrap" }),
        ui.spacer(),
        ui.kv("Version", ui.colors.primary(`v${revealed.secret.versionNumber}`)),
        ui.kv("Updated", ui.formatDateTime(revealed.secret.updatedAt), { overflow: "wrap" }),
      ]);

      if (opts.copy) {
        const { default: clipboardy } = await import("clipboardy");
        await clipboardy.write(revealed.secret.value);
        ui.info("Value copied to clipboard");
      }

      ui.newline();
    }),
  );

secretCommand
  .command("delete")
  .description("Delete a secret")
  .argument("[name]", "Secret name")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("-y, --yes", "Skip confirmation")
  .action((nameArg: string | undefined, opts) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id });
      if (secrets.length === 0) {
        abort("No secrets found.");
      }

      let secret = nameArg
        ? secrets.find((item) => item.name.toLowerCase() === nameArg.toLowerCase())
        : undefined;
      if (!secret) {
        const selected = await promptSelect(
          {
            message: "Select secret:",
            choices: secrets.map((item) => ({ name: item.name, value: item.id })),
          },
          "Secret selection requires interactive mode or an explicit name.",
        );
        secret = secrets.find((item) => item.id === selected);
      }
      if (!secret) {
        abort(`Secret "${nameArg}" not found.`);
      }

      if (!opts.yes) {
        const confirmed = await promptConfirm(
          { message: `Delete secret "${secret.name}"?`, default: false },
          "Use --yes when deleting a secret in non-interactive mode.",
        );
        if (!confirmed) {
          ui.warn("Cancelled");
          ui.newline();
          return;
        }
      }

      await sdk.deleteSecret(secret.id);
      renderData({ success: true, secretId: secret.id });
      ui.success(`Secret "${secret.name}" deleted`);
      ui.newline();
    }),
  );
