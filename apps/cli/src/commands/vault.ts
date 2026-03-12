import { Command } from "commander";
import * as authStore from "../lib/auth-store.js";
import { requireActiveOrganization, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptConfirm, promptInput, promptPassword, promptSelect } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
import { isNonInteractive } from "../lib/runtime.js";

interface VaultCreateOptions {
  name?: string;
  description?: string;
  password?: boolean;
}

interface DeleteOptions {
  yes?: boolean;
}

export const vaultCommand = new Command("vault").description("Manage vaults");

vaultCommand
  .command("list")
  .description("List vaults in the active organization")
  .action(() =>
    runCommand(async () => {
      requireAuth();
      const organization = await requireActiveOrganization();
      const vaults = await sdk.getVaults(organization.id);
      renderData({ organization, vaults });
      if (vaults.length === 0) {
        ui.warn("No vaults found");
        ui.newline();
        return;
      }

      ui.cards(
        vaults.map((vault) => ({
          id: vault.id,
          name: vault.name,
          active: vault.id === authStore.getVaultId(),
          fields: [
            ...(vault.description ? [{ value: vault.description, overflow: "wrap" as const }] : []),
            { label: "Keys", value: String(vault._count?.keys || 0), overflow: "truncate" },
          ],
        })),
      );
    }),
  );

vaultCommand
  .command("create")
  .description("Create a vault")
  .option("-n, --name <name>", "Vault name")
  .option("-d, --description <description>", "Description")
  .option("-p, --password", "Prompt for a vault password")
  .action((opts: VaultCreateOptions) =>
    runCommand(async () => {
      requireAuth();
      const organization = await requireActiveOrganization();
      const name =
        opts.name ||
        (await promptInput(
          { message: "Vault name:", validate: (value: string) => (value.trim() ? true : "Name is required") },
          "Vault name is required in non-interactive mode.",
        ));
      const description =
        opts.description ??
        (!isNonInteractive()
          ? await promptInput({ message: "Description (optional):" }, "")
          : undefined);

      let password: string | undefined;
      if (opts.password) {
        password = await promptPassword({ message: "Vault password:" }, "Vault password is required in non-interactive mode.");
        const confirmation = await promptPassword(
          { message: "Confirm vault password:" },
          "Vault password confirmation is required in non-interactive mode.",
        );
        if (password !== confirmation) {
          abort("Vault passwords do not match.");
        }
      }

      const vault = await sdk.createVault({
        name: name.trim(),
        description: description?.trim() || undefined,
        organizationId: organization.id,
        password,
      });
      authStore.saveVault({
        id: vault.id,
        name: vault.name,
        organizationId: vault.organizationId,
      });
      renderData({ vault });
      ui.success(`Vault "${vault.name}" created`);
      ui.newline();
    }),
  );

vaultCommand
  .command("select")
  .description("Select an active vault")
  .argument("[query]", "Vault name, full id, or short id")
  .action((query: string | undefined) =>
    runCommand(async () => {
      requireAuth();
      const organization = await requireActiveOrganization();
      const vaults = await sdk.getVaults(organization.id);
      if (vaults.length === 0) {
        abort("No vaults found.", { suggestions: ["Run: hermes vault create"] });
      }

      let vault = query ? await resolveVault(query) : undefined;
      if (!vault) {
        const selected = await promptSelect(
          {
            message: "Select vault:",
            choices: vaults.map((item) => ({
              name: `${ui.shortId(item.id)}  ${item.name}${item.description ? ` - ${item.description}` : ""}`,
              value: item.id,
            })),
          },
          "Vault selection requires interactive mode or an explicit query.",
        );
        vault = vaults.find((item) => item.id === selected);
      }

      if (!vault) {
        abort("No vault selected.");
      }

      authStore.saveVault({ id: vault.id, name: vault.name, organizationId: vault.organizationId });
      renderData({ vault });
      ui.success(`Vault set to ${vault.name}`);
      ui.newline();
    }),
  );

vaultCommand
  .command("delete")
  .description("Delete a vault")
  .argument("[query]", "Vault name, full id, or short id")
  .option("-y, --yes", "Skip confirmation")
  .action((query: string | undefined, opts: DeleteOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = await resolveVault(query);
      if (!opts.yes) {
        const confirmed = await promptConfirm(
          {
            message: `Delete vault "${vault.name}"?`,
            default: false,
          },
          "Use --yes when deleting a vault in non-interactive mode.",
        );
        if (!confirmed) {
          ui.warn("Cancelled");
          ui.newline();
          return;
        }
      }

      await sdk.deleteVault(vault.id);
      if (authStore.getVaultId() === vault.id) {
        authStore.clearVault();
      }
      renderData({ success: true, vaultId: vault.id });
      ui.success(`Vault "${vault.name}" deleted`);
      ui.newline();
    }),
  );

vaultCommand
  .command("get")
  .description("Show the active vault or a specific vault")
  .argument("[query]", "Vault name, full id, or short id")
  .action((query: string | undefined) =>
    runCommand(async () => {
      requireAuth();
      const vault = await resolveVault(query);
      renderData({ vault });
      ui.panel("Vault", [
        ui.kv("Name", ui.colors.primary(vault.name), { overflow: "truncate" }),
        ui.kv("ID", ui.colors.cyan(vault.id), { overflow: "truncate" }),
        ui.kv("Keys", ui.colors.primary(String(vault._count?.keys || 0)), { overflow: "truncate" }),
      ]);
      ui.newline();
    }),
  );
