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
import * as authStore from "./lib/auth-store.js";
import { abort, renderData, requireAuth, runCommand } from "./lib/command-helpers.js";
import { promptConfirm, promptEditor, promptInput, promptPassword, promptSelect } from "./lib/prompts.js";
import { requireActiveVault, requireByIdOrName, resolveGroup, resolveGroupByPath, resolveVault } from "./lib/context.js";
import * as sdk from "./lib/sdk.js";
import * as ui from "./lib/ui.js";
import { isNonInteractive } from "./lib/runtime.js";

interface GlobalOptions {
  json?: boolean;
  nonInteractive?: boolean;
  color?: boolean;
}

/** Split `prod/api/SECRET_NAME` → `{ path: "prod/api", name: "SECRET_NAME" }` */
function parsePathArg(arg: string): { path: string | undefined; name: string } {
  const i = arg.lastIndexOf("/");
  return i === -1
    ? { path: undefined, name: arg }
    : { path: arg.slice(0, i), name: arg.slice(i + 1) };
}

const SECRET_LOOKUP_LIMIT = 200;

const program = new Command();

program
  .name("hermit")
  .description("Hermit KMS - Secure secret management from your terminal")
  .version(__VERSION__)
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

// ---------------------------------------------------------------------------
// Shorthand: hermit login  (alias: hermit auth login)
// ---------------------------------------------------------------------------
program
  .command("login")
  .description("Log in to Hermit (alias: auth login)")
  .option("-s, --server <url>", "Server URL")
  .option("-e, --email <email>", "Account email")
  .option("-p, --password <password>", "Account password")
  .option("--mfa-token <token>", "MFA token when two-factor authentication is required")
  .action((opts: { server?: string; email?: string; password?: string; mfaToken?: string }) =>
    runCommand(async () => {
      ui.newline();
      if (opts.server) {
        authStore.setServerUrl(opts.server);
      }

      const email =
        opts.email ||
        (await promptInput(
          {
            message: "Email:",
            validate: (value: string) => (value.includes("@") ? true : "Enter a valid email"),
          },
          "Email is required in non-interactive mode.",
        ));
      const password =
        opts.password ||
        (await promptPassword(
          { message: "Password:" },
          "Password is required in non-interactive mode.",
        ));

      interface MfaApiError {
        statusCode?: number;
        details?: { error?: { code?: string } };
      }

      let result: sdk.LoginResult;
      try {
        result = await sdk.login({ email, password, mfaToken: opts.mfaToken });
      } catch (error: unknown) {
        const apiError = error as MfaApiError;
        const code = apiError.details?.error?.code;
        if (apiError.statusCode === 401 && code === "MFA_REQUIRED") {
          const mfaToken =
            opts.mfaToken ||
            (await promptInput(
              {
                message: "MFA token:",
                validate: (value: string) => (/^\d{6}$/.test(value) ? true : "Enter a 6-digit token"),
              },
              "MFA token is required in non-interactive mode.",
            ));
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

// ---------------------------------------------------------------------------
// Shorthand: hermit logout  (alias: hermit auth logout)
// ---------------------------------------------------------------------------
program
  .command("logout")
  .description("Log out of Hermit (alias: auth logout)")
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

// ---------------------------------------------------------------------------
// Shorthand: hermit ls [path]  (alias: hermit secret list --path <path>)
// ---------------------------------------------------------------------------
program
  .command("ls [path]")
  .description("List secrets (alias: secret list)")
  .option("--vault <query>", "Vault name or id")
  .option("--group <query>", "Group id or name")
  .option("--search <term>", "Search term")
  .action((pathArg: string | undefined, opts: { vault?: string; group?: string; search?: string }) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = pathArg
        ? await resolveGroupByPath(vault.id, pathArg)
        : await resolveGroup(vault.id, opts.group);
      const childGroups = opts.search
        ? []
        : await sdk.getSecretGroups(vault.id, group ? { parentId: group.id } : {});
      const secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: opts.search,
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

// ---------------------------------------------------------------------------
// Shorthand: hermit get <path/name>  (alias: hermit secret get)
// hermit get DATABASE_URL
// hermit get prod/api/DATABASE_URL
// ---------------------------------------------------------------------------
program
  .command("get <pathName>")
  .description("Reveal a secret value (alias: secret get)")
  .option("--vault <query>", "Vault name or id")
  .option("--password <password>", "Secret password for password-protected secrets")
  .option("--vault-password <password>", "Vault password for vault-protected secrets")
  .option("-c, --copy", "Copy to clipboard")
  .action((pathName: string, opts: { vault?: string; password?: string; vaultPassword?: string; copy?: boolean }) =>
    runCommand(async () => {
      requireAuth();
      const { path, name } = parsePathArg(pathName);
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = path ? await resolveGroupByPath(vault.id, path) : undefined;
      let secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: name,
        limit: SECRET_LOOKUP_LIMIT,
      });
      if (secrets.length === 0) {
        // Retry without search filter to allow ID-prefix matching
        secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id, limit: SECRET_LOOKUP_LIMIT });
      }
      if (secrets.length === 0) {
        abort("No secrets found.");
      }

      const secret = requireByIdOrName(secrets, name, "secret");

      interface RevealApiError {
        statusCode?: number;
        details?: { error?: { code?: string } };
      }

      let secretPassword = opts.password;
      let vaultPassword = opts.vaultPassword;
      let revealed: sdk.SecretRevealResult;

      try {
        revealed = await sdk.revealSecret(secret.id, { password: secretPassword, vaultPassword });
      } catch (error: unknown) {
        const apiError = error as RevealApiError;
        const code = apiError.details?.error?.code;
        if (apiError.statusCode === 403 && code === "SECRET_PASSWORD_REQUIRED") {
          secretPassword = await promptPassword(
            { message: "Secret password:" },
            "Secret password is required in non-interactive mode.",
          );
          revealed = await sdk.revealSecret(secret.id, { password: secretPassword });
        } else if (apiError.statusCode === 403 && code === "VAULT_PASSWORD_REQUIRED") {
          vaultPassword = await promptPassword(
            { message: "Vault password:" },
            "Vault password is required in non-interactive mode.",
          );
          revealed = await sdk.revealSecret(secret.id, { vaultPassword });
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

// ---------------------------------------------------------------------------
// Shorthand: hermit set <path/name> [value]  (alias: hermit secret set)
// hermit set DATABASE_URL postgres://...
// hermit set prod/api/DATABASE_URL postgres://...
// ---------------------------------------------------------------------------
program
  .command("set <pathName> [value]")
  .description("Create or update a secret (alias: secret set)")
  .option("--vault <query>", "Vault name or id")
  .option("--key <id>", "Key id")
  .option("--type <type>", "Value type (STRING, JSON, NUMBER, BOOLEAN, MULTILINE)")
  .option("--description <description>", "Description")
  .option("--password", "Prompt for a secret password")
  .action((pathName: string, valueArg: string | undefined, opts: { vault?: string; key?: string; type?: string; description?: string; password?: boolean }) =>
    runCommand(async () => {
      requireAuth();
      const { path, name } = parsePathArg(pathName);
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = path ? await resolveGroupByPath(vault.id, path) : await resolveGroup(vault.id, undefined);
      const secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id });

      const valueTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;
      type ValueType = (typeof valueTypes)[number];

      const valueType: ValueType =
        (opts.type as ValueType) ||
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

      const existing = secrets.find((secret) => secret.name.toLowerCase() === name.toLowerCase());

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

// ---------------------------------------------------------------------------
// Shorthand: hermit rm <path/name>  (alias: hermit secret delete)
// hermit rm DATABASE_URL
// hermit rm prod/api/DATABASE_URL -y
// ---------------------------------------------------------------------------
program
  .command("rm <pathName>")
  .description("Delete a secret (alias: secret delete)")
  .option("--vault <query>", "Vault name or id")
  .option("-y, --yes", "Skip confirmation")
  .action((pathName: string, opts: { vault?: string; yes?: boolean }) =>
    runCommand(async () => {
      requireAuth();
      const { path, name } = parsePathArg(pathName);
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = path ? await resolveGroupByPath(vault.id, path) : undefined;
      let secrets = await sdk.getSecrets(vault.id, {
        secretGroupId: group?.id,
        search: name,
        limit: SECRET_LOOKUP_LIMIT,
      });
      if (secrets.length === 0) {
        // Retry without search filter to allow ID-prefix matching
        secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id, limit: SECRET_LOOKUP_LIMIT });
      }
      if (secrets.length === 0) {
        abort("No secrets found.");
      }

      const secret = requireByIdOrName(secrets, name, "secret");

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

// ---------------------------------------------------------------------------
// Shorthand: hermit tree [path]  (alias: hermit group tree)
// hermit tree
// hermit tree prod/api
// ---------------------------------------------------------------------------
program
  .command("tree [path]")
  .description("Show secret group hierarchy (alias: group tree)")
  .option("--vault <query>", "Vault name or id")
  .action((pathArg: string | undefined, opts: { vault?: string }) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();

      async function renderGroupTree(vaultId: string, parentId?: string | null, prefix = ""): Promise<string[]> {
        const groups = await sdk.getSecretGroups(vaultId, parentId ? { parentId } : {});
        const lines: string[] = [];
        for (const group of groups) {
          lines.push(`${prefix}${group.name}`);
          lines.push(...(await renderGroupTree(vaultId, group.id, `${prefix}  `)));
        }
        return lines;
      }

      let rootId: string | undefined;
      if (pathArg) {
        const rootGroup = await resolveGroupByPath(vault.id, pathArg);
        rootId = rootGroup?.id;
      }

      const lines = await renderGroupTree(vault.id, rootId);
      renderData({ vault, tree: lines });
      if (lines.length === 0) {
        ui.warn("No secret groups found");
        ui.newline();
        return;
      }
      const label = pathArg ? `Groups - ${vault.name} / ${pathArg}` : `Groups - ${vault.name}`;
      ui.listPanel(label, lines);
      ui.newline();
    }),
  );

(async () => {
  await program.parseAsync(process.argv);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
