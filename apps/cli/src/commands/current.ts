import { Command } from "commander";
import { renderData, runCommand } from "../lib/command-helpers.js";
import { resolveConfigPath, loadProjectConfig } from "../lib/config.js";
import * as authStore from "../lib/auth-store.js";
import * as ui from "../lib/ui.js";

export const currentCommand = new Command("current")
  .description("Show the active context")
  .action(() =>
    runCommand(async () => {
      const serverUrl = authStore.getServerUrl();
      const user = authStore.getUser();
      const org = authStore.getOrg();
      const vault = authStore.getVault();
      const group = authStore.getGroup();
      const authenticated = authStore.isAuthenticated();
      const configPath = resolveConfigPath();
      const config = configPath ? loadProjectConfig() : null;

      renderData({
        serverUrl,
        authenticated,
        user: user ? { id: user.id, email: user.email } : null,
        org: org ? { id: org.id, name: org.name } : null,
        vault: vault ? { id: vault.id, name: vault.name } : null,
        group: group ? { id: group.id, name: group.name } : null,
        configPath,
      });

      const rows: ui.PanelRow[] = [];

      // Server
      rows.push(ui.kv("Server", ui.colors.cyan(serverUrl)));

      // Auth status
      rows.push(
        ui.kv(
          "Auth",
          authenticated
            ? ui.colors.green("authenticated")
            : ui.colors.red("not authenticated"),
        ),
      );

      if (user) {
        rows.push(ui.kv("User", ui.colors.primary(`${user.email}`)));
      }

      rows.push(ui.spacer());

      // Organization
      if (org) {
        rows.push(ui.kv("Org", `${ui.colors.bright(org.name)}  ${ui.formatShortId(org.id)}`));
      } else {
        rows.push(ui.kv("Org", ui.colors.dim("(none)")));
      }

      // Vault
      if (vault) {
        rows.push(ui.kv("Vault", `${ui.colors.bright(vault.name)}  ${ui.formatShortId(vault.id)}`));
      } else {
        rows.push(ui.kv("Vault", ui.colors.dim("(none)")));
      }

      // Environment / Group
      if (group) {
        // Check if .hermit.yml maps a different env name to this group
        let envLabel = group.name;
        if (config?.environments) {
          for (const [envName, envConfig] of Object.entries(config.environments)) {
            if (envConfig.group === group.name || envConfig.path === group.name) {
              if (envName !== group.name) {
                envLabel = `${envName} -> ${group.name}`;
              }
              break;
            }
          }
        }
        rows.push(ui.kv("Env", `${ui.colors.bright(envLabel)}  ${ui.formatShortId(group.id)}`));
      } else {
        rows.push(ui.kv("Env", ui.colors.dim("(none)")));
      }

      rows.push(ui.spacer());

      // Config path
      if (configPath) {
        rows.push(ui.kv("Config", ui.colors.primary(configPath), { overflow: "wrap" }));
      } else {
        rows.push(ui.kv("Config", ui.colors.dim("no .hermit.yml found")));
      }

      ui.panel("Current Context", rows, { labelWidth: 8 });
      ui.newline();
    }),
  );
