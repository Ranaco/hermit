import { Command } from "commander";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { groupCommand } from "./commands/group.js";
import { keyCommand } from "./commands/key.js";
import { orgCommand } from "./commands/org.js";
import { runCommand as secretRunCommand } from "./commands/run.js";
import { secretCommand } from "./commands/secret.js";
import { teamCommand } from "./commands/team.js";
import { vaultCommand } from "./commands/vault.js";
import { whoamiCommand } from "./commands/whoami.js";
import { resolveConfiguredServerUrl } from "./lib/config.js";
import { setRuntimeState } from "./lib/runtime.js";

interface GlobalOptions {
  json?: boolean;
  nonInteractive?: boolean;
  color?: boolean;
}

const program = new Command();

program
  .name("hermit")
  .description("Hermit KMS - Secure secret management from your terminal")
  .version("0.1.0")
  .option("--json", "Emit machine-readable JSON output")
  .option("--non-interactive", "Disable prompts and animated output")
  .option("--no-color", "Disable terminal colors");

program.hook("preAction", (thisCommand: Command) => {
  const options = thisCommand.optsWithGlobals() as GlobalOptions;

  setRuntimeState({
    outputMode: options.json ? "json" : options.nonInteractive || !process.stdout.isTTY ? "plain" : "interactive",
    nonInteractive: !!options.nonInteractive || !process.stdin.isTTY,
    colorEnabled: options.color !== false,
    serverUrlOverride: resolveConfiguredServerUrl() || undefined,
  });
});

program.addCommand(authCommand);
program.addCommand(orgCommand);
program.addCommand(teamCommand);
program.addCommand(vaultCommand);
program.addCommand(keyCommand);
program.addCommand(groupCommand);
program.addCommand(secretCommand);
program.addCommand(secretRunCommand);
program.addCommand(configCommand);
program.addCommand(whoamiCommand);

await program.parseAsync(process.argv);
