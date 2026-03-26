import { Command } from "commander";
import { findByIdOrName, requireActiveOrganization, requireActiveVault, resolveGroup } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { loadProjectConfig, resolveEnvironmentConfig } from "../lib/config.js";
import * as authStore from "../lib/auth-store.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";

export const useCommand = new Command("use")
  .description("Set active context (org, vault, or env)")
  .action(() => {
    abort("A subcommand is required: org, vault, or env.", {
      suggestions: [
        "hermit use org <name>",
        "hermit use vault <name>",
        "hermit use env <name>",
      ],
    });
  });

// ── use org ───────────────────────────────────────────────────────────────────

useCommand
  .command("org")
  .description("Set the active organization")
  .argument("<name>", "Organization name or id")
  .action((name: string) =>
    runCommand(async () => {
      requireAuth();

      const organizations = await sdk.getOrganizations();
      const org = findByIdOrName(organizations, name);
      if (!org) {
        abort(`No organization matches "${name}".`, {
          suggestions: organizations.map((o) => `  ${o.name} (${ui.shortId(o.id)})`),
        });
      }

      authStore.saveOrg({ id: org.id, name: org.name, slug: org.slug || undefined });
      authStore.clearVault();
      authStore.clearGroup();

      renderData({ org: { id: org.id, name: org.name } });
      ui.success(`Active organization set to "${org.name}"`);
      ui.newline();
    }),
  );

// ── use vault ─────────────────────────────────────────────────────────────────

useCommand
  .command("vault")
  .description("Set the active vault")
  .argument("<name>", "Vault name or id")
  .action((name: string) =>
    runCommand(async () => {
      requireAuth();

      const org = await requireActiveOrganization();
      const vaults = await sdk.getVaults(org.id);
      const vault = findByIdOrName(vaults, name);
      if (!vault) {
        abort(`No vault matches "${name}".`, {
          suggestions: vaults.map((v) => `  ${v.name} (${ui.shortId(v.id)})`),
        });
      }

      authStore.saveVault({ id: vault.id, name: vault.name, organizationId: vault.organizationId });
      authStore.clearGroup();

      renderData({ vault: { id: vault.id, name: vault.name } });
      ui.success(`Active vault set to "${vault.name}"`);
      ui.newline();
    }),
  );

// ── use env ───────────────────────────────────────────────────────────────────

useCommand
  .command("env")
  .description("Set the active environment (group)")
  .argument("<name>", "Environment name or group name/id")
  .action((name: string) =>
    runCommand(async () => {
      requireAuth();

      const vault = await requireActiveVault();
      const config = loadProjectConfig();
      let groupQuery = name;

      // Config-first resolution
      if (config?.environments?.[name]) {
        const envConfig = resolveEnvironmentConfig(config, name);
        groupQuery = envConfig.group || envConfig.path || name;
      }

      // Resolve group server-side
      const group = await resolveGroup(vault.id, groupQuery);
      if (!group) {
        abort(`No group matches "${groupQuery}".`);
      }

      authStore.saveGroup({ id: group.id, name: group.name });

      renderData({ group: { id: group.id, name: group.name } });
      ui.success(`Active environment set to "${group.name}"`);
      ui.newline();
    }),
  );
