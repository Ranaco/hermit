import { Command } from "commander";
import { resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand as executeCommand } from "../lib/command-helpers.js";
import { loadProjectConfig, resolveEnvironmentConfig } from "../lib/config.js";
import { runWithEnv } from "../lib/process-runner.js";
import { setRuntimeState } from "../lib/runtime.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
export const runCommand = new Command("run")
    .description("Run a command with secrets injected as environment variables")
    .option("--vault <query>", "Vault name or id")
    .option("--org <query>", "Organization name or id")
    .option("--group <query>", "Group id or name")
    .option("--path <path>", "Group path like prod/api")
    .option("--secret <name>", "Inject only one secret by name")
    .option("--env <name>", "Environment from .hermes.yml")
    .option("--config <path>", "Path to .hermes.yml")
    .option("--password <password>", "Secret-level password used for protected secrets")
    .option("--vault-password <password>", "Vault password used for protected vaults")
    .argument("[command...]", "Command to run")
    .allowExcessArguments(true)
    .action((commandArgs, opts) => executeCommand(async () => {
    requireAuth();
    const dashDash = process.argv.indexOf("--");
    const finalArgs = commandArgs.length > 0 ? commandArgs : dashDash >= 0 ? process.argv.slice(dashDash + 1) : [];
    if (finalArgs.length === 0) {
        abort("No command specified.", {
            suggestions: ["Usage: hermes run -- npm run dev"],
        });
    }
    let configOrganization = opts.org;
    let configVault = opts.vault;
    let configGroup = opts.group;
    let configPath = opts.path;
    let configSecrets;
    let configMap;
    if (opts.env) {
        const config = loadProjectConfig(opts.config);
        const environment = resolveEnvironmentConfig(config, opts.env);
        setRuntimeState({ serverUrlOverride: config?.server || undefined });
        configOrganization = configOrganization || environment.organization;
        configVault = configVault || environment.vault;
        configGroup = configGroup || environment.group;
        configPath = configPath || environment.path;
        configSecrets = environment.secrets;
        configMap = environment.map;
    }
    const vault = await resolveVault(configVault, { organizationQuery: configOrganization });
    const group = configPath
        ? await resolveGroupByPath(vault.id, configPath)
        : await resolveGroup(vault.id, configGroup);
    const result = await sdk.bulkRevealSecrets({
        vaultId: vault.id,
        secretGroupId: group?.id,
        password: opts.password,
        vaultPassword: opts.vaultPassword,
    });
    if (result.error) {
        abort(result.error.message, { details: result.error });
    }
    let revealedSecrets = result.secrets;
    if (opts.secret) {
        revealedSecrets = revealedSecrets.filter((secret) => secret.name.toLowerCase() === opts.secret?.toLowerCase());
    }
    if (configSecrets?.length) {
        const allowed = new Set(configSecrets.map((item) => item.toLowerCase()));
        revealedSecrets = revealedSecrets.filter((secret) => allowed.has(secret.name.toLowerCase()));
    }
    if (revealedSecrets.length === 0) {
        abort("No injectable secrets matched the current selection.");
    }
    const envVars = Object.fromEntries(revealedSecrets.map((secret) => [configMap?.[secret.name] || secret.name, secret.value]));
    renderData({
        vault,
        group,
        injected: Object.keys(envVars),
        skipped: result.skipped,
    });
    ui.panel("Environment Injection", [
        ui.kv("Injecting", ui.colors.bright(String(Object.keys(envVars).length))),
        ...Object.keys(envVars).slice(0, 5).map((name) => ui.kv(name, ui.formatSecretValue("masked", "masked"), { overflow: "truncate" })),
        ...(result.skipped.length ? [ui.kv("Skipped", ui.colors.primary(String(result.skipped.length)))] : []),
    ]);
    ui.info(`Starting: ${finalArgs.join(" ")}`);
    ui.newline();
    const [command, ...args] = finalArgs;
    const exitCode = await runWithEnv(command, args, envVars);
    process.exit(exitCode);
}));
