import { Command } from "commander";
import { secretExportCommand } from "./export.js";
import { secretImportCommand } from "./import.js";
import { runCommand } from "../lib/command-helpers.js";
import {
  handleSecretDelete,
  handleSecretGet,
  handleSecretList,
  handleSecretSet,
  type ValueType,
} from "../lib/secret-handlers.js";

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
  file?: string;
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

export const secretCommand = new Command("secret").description("Manage secrets");
secretCommand.addCommand(secretExportCommand);
secretCommand.addCommand(secretImportCommand);

secretCommand
  .command("list")
  .description("List secrets in a vault")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("--search <term>", "Search term")
  .action((opts: SecretListOptions) =>
    runCommand(() =>
      handleSecretList({
        vaultQuery: opts.vault,
        groupQuery: opts.group,
        pathQuery: opts.path,
        search: opts.search,
      }),
    ),
  );

secretCommand
  .command("set")
  .description("Create or update a secret")
  .argument("[name]", "Secret name")
  .argument("[value]", "Secret value")
  .option("--vault <query>", "Vault name or id")
  .option("--key <id>", "Key id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("--type <type>", "Value type")
  .option("--description <description>", "Description")
  .option("--password", "Prompt for a secret password")
  .option("-f, --file <filepath>", "Read secret value from a file")
  .action((nameArg: string | undefined, valueArg: string | undefined, opts: SecretSetOptions) =>
    runCommand(() =>
      handleSecretSet({
        name: nameArg,
        value: valueArg,
        vaultQuery: opts.vault,
        groupQuery: opts.group,
        pathQuery: opts.path,
        keyId: opts.key,
        type: opts.type,
        description: opts.description,
        password: opts.password,
        file: opts.file,
      }),
    ),
  );

secretCommand
  .command("get")
  .description("Reveal a secret value")
  .argument("[query]", "Secret name, id, or short id prefix")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("--password <password>", "Secret password for password-protected secrets")
  .option("--vault-password <password>", "Vault password for vault-protected secrets")
  .option("-c, --copy", "Copy to clipboard")
  .action((queryArg: string | undefined, opts: SecretGetOptions) =>
    runCommand(() =>
      handleSecretGet({
        query: queryArg,
        vaultQuery: opts.vault,
        groupQuery: opts.group,
        pathQuery: opts.path,
        password: opts.password,
        vaultPassword: opts.vaultPassword,
        copy: opts.copy,
      }),
    ),
  );

secretCommand
  .command("delete")
  .description("Delete a secret")
  .argument("[query]", "Secret name, id, or short id prefix")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("-y, --yes", "Skip confirmation")
  .action((queryArg: string | undefined, opts: SecretDeleteOptions) =>
    runCommand(() =>
      handleSecretDelete({
        query: queryArg,
        vaultQuery: opts.vault,
        groupQuery: opts.group,
        pathQuery: opts.path,
        yes: opts.yes,
      }),
    ),
  );
