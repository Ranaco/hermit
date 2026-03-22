import { Command } from "commander";
import { requireActiveVault, resolveGroup, resolveGroupByPath, resolveVault } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { handleGroupTree } from "../lib/group-handlers.js";
import { promptConfirm, promptInput } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
import { isNonInteractive } from "../lib/runtime.js";

interface GroupListOptions {
  vault?: string;
  parent?: string;
}

interface GroupCreateOptions {
  vault?: string;
  parent?: string;
  path?: string;
  name?: string;
  description?: string;
}

interface GroupUpdateOptions {
  vault?: string;
  name?: string;
  description?: string;
}

interface GroupDeleteOptions {
  vault?: string;
  yes?: boolean;
}

export const groupCommand = new Command("group").description("Manage secret groups");

groupCommand
  .command("list")
  .description("List groups in the active vault")
  .option("--vault <query>", "Vault name or id")
  .option("--parent <id>", "Parent group id")
  .action((opts: GroupListOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const groups = await sdk.getSecretGroups(vault.id, opts.parent ? { parentId: opts.parent } : {});
      renderData({ vault, groups });
      if (groups.length === 0) {
        ui.warn("No secret groups found");
        ui.newline();
        return;
      }
      const label = opts.parent ? `${vault.name} / ${opts.parent}` : vault.name;
      const treeItems: ui.TreeListingItem[] = groups.map((group) => ({
        id: group.id,
        name: group.name,
        isGroup: true,
        meta: `${group._count?.secrets ?? 0} secrets · ${group._count?.children ?? 0} groups`,
      }));
      ui.treeListing(label, treeItems);
    }),
  );

groupCommand
  .command("create")
  .description("Create a secret group")
  .option("--vault <query>", "Vault name or id")
  .option("--parent <query>", "Parent group id or name")
  .option("-p, --path <path>", "Path like prod/api")
  .option("-n, --name <name>", "Group name")
  .option("-d, --description <description>", "Description")
  .action((opts: GroupCreateOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const parent = opts.path
        ? await resolveGroupByPath(vault.id, opts.path)
        : await resolveGroup(vault.id, opts.parent);
      const name =
        opts.name ||
        (await promptInput(
          { message: "Group name:", validate: (value: string) => (value.trim() ? true : "Name is required") },
          "Group name is required in non-interactive mode.",
        ));
      const description =
        opts.description ??
        (!isNonInteractive()
          ? await promptInput({ message: "Description (optional):" }, "")
          : undefined);
      const group = await sdk.createSecretGroup({
        vaultId: vault.id,
        name: name.trim(),
        description: description?.trim() || undefined,
        parentId: parent?.id,
      });
      renderData({ group });
      ui.success(`Group "${group.name}" created`);
      ui.newline();
    }),
  );

groupCommand
  .command("update")
  .description("Update a secret group")
  .argument("<query>", "Group id, short id, or name")
  .option("--vault <query>", "Vault name or id")
  .option("-n, --name <name>", "New name")
  .option("-d, --description <description>", "New description")
  .action((query: string, opts: GroupUpdateOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = await resolveGroup(vault.id, query);
      if (!group) {
        abort(`No group matches "${query}".`);
      }
      const updated = await sdk.updateSecretGroup(vault.id, group.id, {
        name: opts.name,
        description: opts.description,
      });
      renderData({ group: updated });
      ui.success(`Group "${updated.name}" updated`);
      ui.newline();
    }),
  );

groupCommand
  .command("delete")
  .description("Delete a secret group")
  .argument("<query>", "Group id, short id, or name")
  .option("--vault <query>", "Vault name or id")
  .option("-y, --yes", "Skip confirmation")
  .action((query: string, opts: GroupDeleteOptions) =>
    runCommand(async () => {
      requireAuth();
      const vault = opts.vault ? await resolveVault(opts.vault) : await requireActiveVault();
      const group = await resolveGroup(vault.id, query);
      if (!group) {
        abort(`No group matches "${query}".`);
      }
      if (!opts.yes) {
        const confirmed = await promptConfirm(
          { message: `Delete group "${group.name}"?`, default: false },
          "Use --yes when deleting a secret group in non-interactive mode.",
        );
        if (!confirmed) {
          ui.warn("Cancelled");
          ui.newline();
          return;
        }
      }
      await sdk.deleteSecretGroup(vault.id, group.id);
      renderData({ success: true, groupId: group.id });
      ui.success(`Group "${group.name}" deleted`);
      ui.newline();
    }),
  );

groupCommand
  .command("tree")
  .description("Render the secret group hierarchy")
  .option("--vault <query>", "Vault name or id")
  .action((opts: { vault?: string }) => runCommand(() => handleGroupTree({ vaultQuery: opts.vault })));
