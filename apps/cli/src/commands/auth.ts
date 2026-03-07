import { Command } from "commander";
import * as authStore from "../lib/auth-store.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptInput, promptPassword } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

export const authCommand = new Command("auth").description("Manage authentication and MFA");

authCommand
  .command("login")
  .description("Log in to Hermes")
  .option("-s, --server <url>", "Server URL")
  .action((opts) =>
    runCommand(async () => {
      ui.newline();
      if (opts.server) {
        authStore.setServerUrl(opts.server);
      }

      const email = await promptInput(
        {
          message: "Email:",
          validate: (value) => (value.includes("@") ? true : "Enter a valid email"),
        },
        "Email is required in non-interactive mode.",
      );
      const password = await promptPassword(
        { message: "Password:" },
        "Password is required in non-interactive mode.",
      );

      let result: sdk.LoginResult;
      try {
        result = await sdk.login({ email, password });
      } catch (error: unknown) {
        const apiError = error as { statusCode?: number; details?: { error?: { code?: string } } };
        const code = apiError.details?.error?.code;
        if (apiError.statusCode === 401 && code === "MFA_REQUIRED") {
          const mfaToken = await promptInput(
            {
              message: "MFA token:",
              validate: (value) => (/^\d{6}$/.test(value) ? true : "Enter a 6-digit token"),
            },
            "MFA token is required in non-interactive mode.",
          );
          result = await sdk.login({ email, password, mfaToken });
        } else {
          throw error;
        }
      }

      authStore.saveTokens(result.tokens);
      authStore.saveUser({
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        name:
          `${result.user.firstName || ""} ${result.user.lastName || ""}`.trim() ||
          result.user.email,
        mfaEnabled: result.user.isTwoFactorEnabled,
      });
      if (result.organization) {
        authStore.saveOrg(result.organization);
      }

      renderData({
        success: true,
        user: result.user,
        organization: result.organization,
        server: authStore.getServerUrl(),
      });

      ui.success(`Logged in as ${result.user.email}`);
      if (result.organization) {
        ui.info(`Organization: ${result.organization.name}`);
      }
      ui.newline();
    }),
  );

authCommand
  .command("logout")
  .description("Log out of Hermes")
  .action(() =>
    runCommand(async () => {
      requireAuth();
      const tokens = authStore.getTokens();
      if (!tokens?.refreshToken) {
        abort("No refresh token found.");
      }

      await sdk.logout(tokens.refreshToken);
      authStore.clearTokens();
      renderData({ success: true });
      ui.success("Logged out");
      ui.newline();
    }),
  );

authCommand
  .command("status")
  .description("Show authentication status")
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
        ui.info("Run: hermes auth login");
        ui.newline();
        return;
      }

      ui.panel("Authentication", [
        ui.kv("User", ui.colors.primary(user?.email || "unknown"), { overflow: "truncate" }),
        ui.kv("Name", ui.colors.primary(user?.name || "unknown"), { overflow: "truncate" }),
        ui.kv("MFA", ui.formatBooleanState(Boolean(user?.mfaEnabled))),
        ui.kv("Org", ui.colors.primary(org?.name || "none selected"), { overflow: "truncate" }),
        ui.kv("Vault", ui.colors.primary(vault?.name || "none selected"), { overflow: "truncate" }),
        ui.kv("Server", ui.formatServerUrl(authStore.getServerUrl()), { overflow: "truncate" }),
      ]);
      ui.newline();
    }),
  );

const mfaCommand = new Command("mfa").description("Manage MFA");

mfaCommand
  .command("setup")
  .description("Start MFA setup and print the secret")
  .action(() =>
    runCommand(async () => {
      requireAuth();
      const result = await sdk.setupMfa();
      renderData({ success: true, ...result });
      ui.panel("MFA Setup", [
        ui.kv("Secret", ui.formatSecretValue(result.secret, "plain"), { overflow: "wrap" }),
        ui.kv("QR", ui.colors.primary("QR code available in JSON output"), { overflow: "wrap" }),
      ]);
      ui.info("Run: hermes auth mfa enable");
      ui.newline();
    }),
  );

mfaCommand
  .command("enable")
  .description("Enable MFA with a verification token")
  .action(() =>
    runCommand(async () => {
      requireAuth();
      const token = await promptInput(
        {
          message: "Verification token:",
          validate: (value) => (/^\d{6}$/.test(value) ? true : "Enter a 6-digit token"),
        },
        "Verification token is required in non-interactive mode.",
      );
      const result = await sdk.enableMfa(token);
      renderData({ success: true, backupCodes: result.backupCodes });
      ui.success("MFA enabled");
      ui.newline();
    }),
  );

mfaCommand
  .command("disable")
  .description("Disable MFA")
  .action(() =>
    runCommand(async () => {
      requireAuth();
      const password = await promptPassword(
        { message: "Current password:" },
        "Current password is required in non-interactive mode.",
      );
      const mfaToken = await promptInput(
        {
          message: "MFA token:",
          validate: (value) => (/^\d{6}$/.test(value) ? true : "Enter a 6-digit token"),
        },
        "MFA token is required in non-interactive mode.",
      );
      await sdk.disableMfa(password, mfaToken);
      renderData({ success: true });
      ui.success("MFA disabled");
      ui.newline();
    }),
  );

authCommand.addCommand(mfaCommand);
authCommand.addCommand(
  new Command("setup-mfa").description("Compatibility alias for `auth mfa setup`").action(() =>
    runCommand(async () => {
      requireAuth();
      const result = await sdk.setupMfa();
      renderData({ success: true, ...result });
      ui.panel("MFA Setup", [
        ui.kv("Secret", ui.formatSecretValue(result.secret, "plain"), { overflow: "wrap" }),
        ui.kv("Next", ui.colors.primary("Run `hermes auth mfa enable`"), { overflow: "wrap" }),
      ]);
      ui.newline();
    }),
  ),
);
