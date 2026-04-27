import { Command, Option } from "commander";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { currentCommand } from "./commands/current.js";
import { envCommand } from "./commands/env.js";
import { secretExportCommand } from "./commands/export.js";
import { useCommand } from "./commands/use.js";
import { groupCommand } from "./commands/group.js";
import { initCommand } from "./commands/init.js";
import { keyCommand } from "./commands/key.js";
import { orgCommand } from "./commands/org.js";
import { runCommand as secretRunCommand } from "./commands/run.js";
import { secretCommand } from "./commands/secret.js";
import { teamCommand } from "./commands/team.js";
import { vaultCommand } from "./commands/vault.js";
import { whoamiCommand } from "./commands/whoami.js";
import { runCommand } from "./lib/command-helpers.js";
import { handleLogin, handleLogout, type LoginOptions } from "./lib/auth-handlers.js";
import { resolveConfiguredServerUrl } from "./lib/config.js";
import { handleGroupTree } from "./lib/group-handlers.js";
import {
  handleSecretDelete,
  handleSecretGet,
  handleSecretList,
  handleSecretSet,
  parseSecretPathArg,
  type ValueType,
} from "./lib/secret-handlers.js";
import { setRuntimeState } from "./lib/runtime.js";

interface GlobalOptions {
  json?: boolean;
  output?: "json" | "table" | "plain" | "raw";
  quiet?: boolean;
  nonInteractive?: boolean;
  color?: boolean;
}

// @ts-ignore
if (typeof __VERSION__ === "undefined") {
  // @ts-ignore
  globalThis.__VERSION__ = "0.0.0-dev";
}

const program = new Command();

program
  .name("hermit")
  .description("Hermit KMS - Secure secret management from your terminal")
  .version(__VERSION__)
  .addOption(new Option("-o, --output <format>", "Output format").choices(["json", "table", "plain", "raw"]))
  .option("--json", "Emit machine-readable JSON output")
  .option("-q, --quiet", "Suppress informational output")
  .option("--non-interactive", "Disable prompts and animated output")
  .option("--no-color", "Disable terminal colors");

program.hook("preAction", (thisCommand: Command) => {
  const options = thisCommand.optsWithGlobals() as GlobalOptions;
  const requestedOutput = options.json ? "json" : options.output;
  const outputMode =
    requestedOutput === "json"
      ? "json"
      : requestedOutput === "raw"
        ? "raw"
        : requestedOutput === "plain"
          ? "plain"
          : requestedOutput === "table"
            ? "interactive"
            : options.nonInteractive || !process.stdout.isTTY
              ? "plain"
              : "interactive";

  setRuntimeState({
    outputMode,
    nonInteractive: !!options.nonInteractive || !process.stdin.isTTY,
    colorEnabled: options.color !== false,
    quiet: !!options.quiet,
    serverUrlOverride: resolveConfiguredServerUrl() || undefined,
  });
});

program.addCommand(authCommand);
program.addCommand(initCommand);
program.addCommand(orgCommand);
program.addCommand(teamCommand);
program.addCommand(vaultCommand);
program.addCommand(keyCommand);
program.addCommand(groupCommand);
program.addCommand(secretCommand);
program.addCommand(secretRunCommand);
program.addCommand(configCommand);
program.addCommand(envCommand);
program.addCommand(secretExportCommand);
program.addCommand(useCommand);
program.addCommand(currentCommand);
program.addCommand(whoamiCommand);

program
  .command("login")
  .description("Log in to Hermit (alias: auth login)")
  .option("-s, --server <url>", "Server URL")
  .option("-e, --email <email>", "Account email")
  .option("-p, --password <password>", "Account password")
  .option("--mfa-token <token>", "MFA token when two-factor authentication is required")
  .action((opts: LoginOptions) => runCommand(() => handleLogin(opts)));

program
  .command("logout")
  .description("Log out of Hermit (alias: auth logout)")
  .action(() => runCommand(() => handleLogout()));

program
  .command("ls [path]")
  .description("List secrets (alias: secret list)")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--search <term>", "Search term")
  .action((pathArg: string | undefined, opts: { vault?: string; group?: string; search?: string }) =>
    runCommand(() =>
      handleSecretList({
        vaultQuery: opts.vault,
        groupQuery: opts.group,
        pathQuery: pathArg,
        search: opts.search,
      }),
    ),
  );

program
  .command("get <pathName>")
  .description("Reveal a secret value (alias: secret get)")
  .option("--vault <query>", "Vault name or id")
  .option("--password <password>", "Secret password for password-protected secrets")
  .option("--vault-password <password>", "Vault password for vault-protected secrets")
  .option("-c, --copy", "Copy to clipboard")
  .action((pathName: string, opts: { vault?: string; password?: string; vaultPassword?: string; copy?: boolean }) =>
    runCommand(() => {
      const { path, name } = parseSecretPathArg(pathName);
      return handleSecretGet({
        query: name,
        pathQuery: path,
        vaultQuery: opts.vault,
        password: opts.password,
        vaultPassword: opts.vaultPassword,
        copy: opts.copy,
      });
    }),
  );

program
  .command("set <pathName> [value]")
  .description("Create or update a secret (alias: secret set)")
  .option("--vault <query>", "Vault name or id")
  .option("--key <id>", "Key id")
  .option("--type <type>", "Value type (STRING, JSON, NUMBER, BOOLEAN, MULTILINE)")
  .option("--description <description>", "Description")
  .option("--password", "Prompt for a secret password")
  .option("-p, --path <path>", "Group path like prod/api")
  .option("-f, --file <filepath>", "Read secret value from a file")
  .action((pathName: string, valueArg: string | undefined, opts: {
    vault?: string;
    key?: string;
    type?: ValueType;
    description?: string;
    password?: boolean;
    path?: string;
    file?: string;
  }) =>
    runCommand(() => {
      const { path: inlinePath, name } = parseSecretPathArg(pathName);
      return handleSecretSet({
        name,
        value: valueArg,
        pathQuery: opts.path || inlinePath,
        vaultQuery: opts.vault,
        keyId: opts.key,
        type: opts.type,
        description: opts.description,
        password: opts.password,
        file: opts.file,
      });
    }),
  );

program
  .command("rm <pathName>")
  .description("Delete a secret (alias: secret delete)")
  .option("--vault <query>", "Vault name or id")
  .option("-y, --yes", "Skip confirmation")
  .action((pathName: string, opts: { vault?: string; yes?: boolean }) =>
    runCommand(() => {
      const { path, name } = parseSecretPathArg(pathName);
      return handleSecretDelete({
        query: name,
        pathQuery: path,
        vaultQuery: opts.vault,
        yes: opts.yes,
      });
    }),
  );

program
  .command("exec", { hidden: true })
  .description("Alias for run")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action(() => {
    // Replace 'exec' with 'run' in argv and re-parse
    const args = process.argv.slice();
    const execIndex = args.indexOf("exec");
    if (execIndex !== -1) {
      args[execIndex] = "run";
    }
    program.parseAsync(args);
  });

program
  .command("tree [path]")
  .description("Show group hierarchy (alias: group tree)")
  .option("--vault <query>", "Vault name or id")
  .action((pathArg: string | undefined, opts: { vault?: string }) =>
    runCommand(() => handleGroupTree({ vaultQuery: opts.vault, pathQuery: pathArg })),
  );

(async () => {
  await program.parseAsync(process.argv);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
