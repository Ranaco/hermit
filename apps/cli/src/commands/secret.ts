import { Command } from "commander";
import { requireActiveVault, requireByIdOrName, resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptConfirm, promptEditor, promptInput, promptPassword, promptSelect } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
import { isNonInteractive } from "../lib/runtime.js";

const valueTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;

type ValueType = (typeof valueTypes)[number];

interface SecretListOptions {
  vault?: string;
  group?: string;
  path?: string;
  search?: string;
}

interface SecretSetOptions {
  vault?: string;
  key?: string;
  group?: string;
  path?: string;
  type?: ValueType;
  description?: string;
  password?: boolean;
}

interface SecretGetOptions {
  vault?: string;
  group?: string;
  path?: string;
  copy?: boolean;
  password?: string;
  vaultPassword?: string;
}

interface SecretDeleteOptions {
  vault?: string;
  group?: string;
  path?: string;
  yes?: boolean;
}

const SECRET_LOOKUP_LIMIT = 200;

interface RevealApiError {
  statusCode?: number;
  details?: {
    error?: {
      code?: string;
      message?: string;
    };
  };
}

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
  .action((opts: SecretListOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const childGroups = opts.search
        ? []
        : await sdk.getSecretGroups(vault.id, group ? { parentId: group.id, cliScope: true } : { cliScope: true });
      const secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: opts.search,
        cliScope: true,
      });
      renderData({ vault, group, childGroups, secrets });
      const label = group
        ? `${vault.name} / ${group.name}`
        : vault.name;
      if (childGroups.length === 0 && secrets.length === 0) {
        ui.info(label);
        ui.warn("No secrets or groups found");
        ui.newline();
        return;
      }
      const treeItems: ui.TreeListingItem[] = [
        ...childGroups.map((g) => ({
          id: g.id,
          name: g.name,
          isGroup: true,
          meta: `${g._count?.secrets ?? 0} secrets · ${g._count?.children ?? 0} groups`,
        })),
        ...secrets.map((secret) => ({
          id: secret.id,
          name: secret.name,
          isGroup: false,
          meta: `${secret.valueType || "STRING"}  v${secret.currentVersion?.versionNumber || 1}`,
        })),
      ];
      ui.treeListing(label, treeItems);
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
  .action((nameArg: string | undefined, valueArg: string | undefined, opts: SecretSetOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      const secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id, cliScope: true });
      const name =
        nameArg ||
        (await promptInput(
          {
            message: "Secret name:",
            validate: (value: string) =>
              /^[a-zA-Z0-9-_. ]+$/.test(value) ? true : "Invalid secret name",
          },
          "Secret name is required in non-interactive mode.",
        ));

      const existing = secrets.find((secret) => secret.name.toLowerCase() === name.toLowerCase());
      const valueType =
        opts.type ||
        (isNonInteractive()
          ? "STRING"
          : await promptSelect<ValueType>(
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
          value = await promptSelect<string>(
            {
              message: "Secret value:",
              choices: [
                { name: "true", value: "true" },
                { name: "false", value: "false" },
              ],
            },
            "Secret value is required in non-interactive mode.",
          );
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
  .argument("[query]", "Secret name, id, or short id prefix")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("--password <password>", "Secret password for password-protected secrets")
  .option("--vault-password <password>", "Vault password for vault-protected secrets")
  .option("-c, --copy", "Copy to clipboard")
  .action((queryArg: string | undefined, opts: SecretGetOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      let secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: queryArg,
        limit: queryArg ? SECRET_LOOKUP_LIMIT : undefined,
        cliScope: true,
      });
      if (queryArg && secrets.length === 0) {
        // Retry without search filter to allow ID-prefix matching
        secrets = await sdk.getSecrets(vault.id, {
          secretGroupId: group?.id,
          limit: SECRET_LOOKUP_LIMIT,
          cliScope: true,
        });
      }
      if (secrets.length === 0) {
        abort("No secrets found.");
      }

      let secret = queryArg
        ? requireByIdOrName(secrets, queryArg, "secret")
        : undefined;
      if (!secret) {
        const selected = await promptSelect(
          {
            message: "Select secret:",
            choices: secrets.map((item) => ({ name: item.name, value: item.id })),
          },
          "Secret id or name is required in non-interactive mode.",
        );
        secret = secrets.find((item) => item.id === selected);
      }

      if (!secret) {
        abort(`Secret "${queryArg}" not found.`);
      }

      let secretPassword = opts.password;
      let vaultPassword = opts.vaultPassword;
      let revealed: sdk.SecretRevealResult;

      try {
        revealed = await sdk.revealSecretCli(secret.id, {
          password: secretPassword,
          vaultPassword,
        });
      } catch (error: unknown) {
        const apiError = error as RevealApiError;
        const code = apiError.details?.error?.code;

        if (apiError.statusCode === 403 && code === "SECRET_PASSWORD_REQUIRED") {
          secretPassword = await promptPassword(
            { message: "Secret password:" },
            "Secret password is required in non-interactive mode.",
          );
          revealed = await sdk.revealSecretCli(secret.id, { password: secretPassword });
        } else if (apiError.statusCode === 403 && code === "VAULT_PASSWORD_REQUIRED") {
          vaultPassword = await promptPassword(
            { message: "Vault password:" },
            "Vault password is required in non-interactive mode.",
          );
          revealed = await sdk.revealSecretCli(secret.id, { vaultPassword });
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
        const clipboardy = await import("clipboardy");
        await clipboardy.default.write(revealed.secret.value);
        ui.info("Value copied to clipboard");
      }

      ui.newline();
    }),
  );

secretCommand
  .command("delete")
  .description("Delete a secret")
  .argument("[query]", "Secret name, id, or short id prefix")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--path <path>", "Group path like prod/api")
  .option("-y, --yes", "Skip confirmation")
  .action((queryArg: string | undefined, opts: SecretDeleteOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.group);
      let secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: queryArg,
        limit: queryArg ? SECRET_LOOKUP_LIMIT : undefined,
        cliScope: true,
      });
      if (queryArg && secrets.length === 0) {
        // Retry without search filter to allow ID-prefix matching
        secrets = await sdk.getSecrets(vault.id, {
          secretGroupId: group?.id,
          limit: SECRET_LOOKUP_LIMIT,
          cliScope: true,
        });
      }
      if (secrets.length === 0) {
        abort("No secrets found.");
      }

      let secret = queryArg
        ? requireByIdOrName(secrets, queryArg, "secret")
        : undefined;
      if (!secret) {
        const selected = await promptSelect(
          {
            message: "Select secret:",
            choices: secrets.map((item) => ({ name: item.name, value: item.id })),
          },
          "Secret selection requires interactive mode or an explicit id or name.",
        );
        secret = secrets.find((item) => item.id === selected);
      }
      if (!secret) {
        abort(`Secret "${queryArg}" not found.`);
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
