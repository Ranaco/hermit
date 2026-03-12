import { Command } from "commander";
import { existsSync, writeFileSync } from "node:fs";
import * as authStore from "../lib/auth-store.js";
import { renderData, runCommand } from "../lib/command-helpers.js";
import { generateTemplate, loadProjectConfig, validateProjectConfig } from "../lib/config.js";
import * as ui from "../lib/ui.js";
export const configCommand = new Command("config").description("Manage CLI configuration");
configCommand
    .command("init")
    .description("Generate a .hermes.yml config file")
    .option("-f, --force", "Overwrite existing file")
    .action((opts) => runCommand(async () => {
    const filePath = `${process.cwd()}/.hermes.yml`;
    if (existsSync(filePath) && !opts.force) {
        ui.warn(".hermes.yml already exists");
        ui.info("Use --force to overwrite");
        ui.newline();
        return;
    }
    writeFileSync(filePath, generateTemplate(), "utf8");
    renderData({ success: true, path: filePath });
    ui.success("Created .hermes.yml");
    ui.newline();
}));
configCommand
    .command("show")
    .description("Show CLI and project config")
    .action(() => runCommand(async () => {
    const config = loadProjectConfig();
    const validation = config ? validateProjectConfig(config) : { valid: true, errors: [] };
    renderData({
        server: authStore.getServerUrl(),
        authenticated: authStore.isAuthenticated(),
        user: authStore.getUser(),
        organization: authStore.getOrg(),
        vault: authStore.getVault(),
        projectConfig: config,
        validation,
    });
    ui.panel("CLI Configuration", [
        ui.kv("Server", ui.formatServerUrl(authStore.getServerUrl()), { overflow: "truncate" }),
        ui.kv("Auth", authStore.isAuthenticated() ? ui.colors.green("logged in") : ui.colors.amber("not logged in")),
        ui.kv("User", ui.colors.primary(authStore.getUser()?.email || "—"), { overflow: "truncate" }),
        ui.kv("Org", ui.colors.primary(authStore.getOrg()?.name || "—"), { overflow: "truncate" }),
        ui.kv("Vault", ui.colors.primary(authStore.getVault()?.name || "—"), { overflow: "truncate" }),
    ]);
    if (config) {
        ui.newline();
        ui.panel("Project Configuration", [
            ui.kv("Version", ui.colors.primary(String(config.version))),
            ui.kv("Envs", ui.colors.primary(Object.keys(config.environments).join(", ")), { overflow: "wrap" }),
            ui.kv("Status", validation.valid ? ui.colors.green("valid") : ui.colors.red("invalid")),
        ]);
    }
    ui.newline();
}));
configCommand
    .command("set-server <url>")
    .description("Persist the Hermes API base URL")
    .action((url) => runCommand(async () => {
    authStore.setServerUrl(url);
    renderData({ success: true, server: url });
    ui.success(`Server set to ${url}`);
    ui.newline();
}));
