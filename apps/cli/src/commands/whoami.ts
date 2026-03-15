import { Command } from "commander";
import * as authStore from "../lib/auth-store.js";
import { renderData, runCommand } from "../lib/command-helpers.js";
import { banner } from "../lib/ui.js";
import * as ui from "../lib/ui.js";

export const whoamiCommand = new Command("whoami")
  .description("Display current user and active context")
  .action(() =>
    runCommand(async () => {
      const authenticated = authStore.isAuthenticated();
      const user = authStore.getUser();
      const org = authStore.getOrg();
      const vault = authStore.getVault();
      renderData({
        authenticated,
        user,
        organization: org,
        vault,
        server: authStore.getServerUrl(),
      });

      if (!authenticated) {
        ui.warn("Not logged in");
        ui.info("Run: hermit auth login");
        ui.newline();
        return;
      }

      await banner();
      ui.panel("Session", [
        ui.kv("User", ui.colors.bright(user?.email || "unknown"), { overflow: "truncate" }),
        ui.kv("Name", ui.colors.primary(user?.name || "unknown"), { overflow: "truncate" }),
        ui.kv("Org", ui.colors.primary(org?.name || "none selected"), { overflow: "truncate" }),
        ui.kv("Vault", ui.colors.primary(vault?.name || "none selected"), { overflow: "truncate" }),
        ui.kv("Server", ui.formatServerUrl(authStore.getServerUrl()), { overflow: "truncate" }),
        ui.kv("MFA", ui.formatBooleanState(Boolean(user?.mfaEnabled))),
      ]);
      ui.newline();
    }),
  );
