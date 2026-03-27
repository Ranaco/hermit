import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import * as authStore from "../lib/auth-store.js";
import { handleLogin } from "../lib/auth-handlers.js";
import { abort, runCommand } from "../lib/command-helpers.js";
import { generateTemplate, resolveConfigPath } from "../lib/config.js";
import { promptConfirm, promptInput, promptSelect } from "../lib/prompts.js";
import { getRuntimeState } from "../lib/runtime.js";
import * as sdk from "../lib/sdk.js";
import { resolveSecretKeyId } from "../lib/secret-handlers.js";
import * as ui from "../lib/ui.js";

interface InitOptions {
  org?: string;
  vault?: string;
  envs?: string;
  force?: boolean;
}

interface ApiError {
  statusCode?: number;
  message?: string;
}

export const initCommand = new Command("init")
  .description("Guided setup wizard — configure org, vault, environments, and .hermit.yml")
  .option("--org <name>", "Organization name (non-interactive)")
  .option("--vault <name>", "Vault name (non-interactive)")
  .option("--envs <names>", "Comma-separated environment names (non-interactive)")
  .option("--force", "Overwrite .hermit.yml without prompting")
  .action((opts: InitOptions) => runCommand(() => handleInit(opts)));

async function handleInit(opts: InitOptions): Promise<void> {
  const nonInteractive = getRuntimeState().nonInteractive;

  ui.newline();

  // ── Step 1: Check auth ──
  if (!authStore.isAuthenticated()) {
    ui.info("You are not logged in.");
    if (nonInteractive) {
      abort("Authentication required. Run `hermit auth login` first.", {
        suggestions: ["Run: hermit auth login"],
      });
    }
    ui.info("Let's log in first.");
    ui.newline();
    await handleLogin({});
    if (!authStore.isAuthenticated()) {
      abort("Authentication failed. Please try again.", {
        suggestions: ["Run: hermit auth login"],
      });
    }
  }

  // ── Step 2: Resolve organization ──
  const org = await resolveOrg(opts, nonInteractive);
  authStore.saveOrg({ id: org.id, name: org.name, slug: org.slug || undefined });
  ui.success(`Organization: ${org.name}`);

  // ── Step 3: Resolve vault ──
  const vault = await resolveVault(opts, nonInteractive, org.id);
  authStore.saveVault({ id: vault.id, name: vault.name, organizationId: org.id });
  ui.success(`Vault: ${vault.name}`);

  // ── Step 4: Create environments (optional) ──
  const envNames = await resolveEnvironments(opts, nonInteractive, vault.id);

  // ── Step 5: Import from .env (optional) ──
  await maybeImportDotEnv(nonInteractive, vault.id, envNames);

  // ── Step 6: Write .hermit.yml ──
  await writeConfig(opts, nonInteractive, org, vault, envNames);

  // ── Step 7: Set active context ──
  // Org and vault already saved above
  // If we created groups, save the first one as active
  if (envNames.length > 0) {
    const groups = await sdk.getGroups(vault.id);
    const firstGroup = groups.find((g) => g.name === envNames[0]);
    if (firstGroup) {
      authStore.saveGroup({ id: firstGroup.id, name: firstGroup.name });
    }
  }

  // ── Step 8: Print success ──
  ui.newline();
  ui.panel("Setup Complete", [
    ui.kv("Org", ui.colors.primary(org.name), { overflow: "truncate" }),
    ui.kv("Vault", ui.colors.primary(vault.name), { overflow: "truncate" }),
    ...(envNames.length > 0
      ? [ui.kv("Envs", ui.colors.primary(envNames.join(", ")), { overflow: "wrap" })]
      : []),
  ]);
  ui.newline();
  ui.info("Next steps:");
  if (envNames.length > 0) {
    ui.info(`  hermit env list`);
    ui.info(`  hermit secret set KEY value --group ${envNames[0]}`);
    ui.info(`  hermit run --env ${envNames[0]} -- <command>`);
  } else {
    ui.info(`  hermit secret set KEY value`);
    ui.info(`  hermit run -- <command>`);
  }
  ui.newline();
}

// ── Organization resolution ──

async function resolveOrg(
  opts: InitOptions,
  nonInteractive: boolean,
): Promise<{ id: string; name: string; slug?: string | null }> {
  const organizations = await sdk.getOrganizations();

  if (opts.org) {
    const match = organizations.find(
      (o) => o.name.toLowerCase() === opts.org!.toLowerCase() || o.slug === opts.org,
    );
    if (match) return match;
    // Create if not found
    ui.info(`Creating organization "${opts.org}"...`);
    const result = await sdk.createOrganization({ name: opts.org });
    return result.organization;
  }

  if (organizations.length === 0) {
    if (nonInteractive) {
      abort("No organizations found. Pass --org <name> to create one.");
    }
    ui.info("No organizations found. Let's create one.");
    const name = await promptInput(
      { message: "Organization name:", validate: (v: string) => (v.trim() ? true : "Name is required") },
      "Organization name is required.",
    );
    const result = await sdk.createOrganization({ name: name.trim() });
    ui.success(`Organization "${result.organization.name}" created`);
    return result.organization;
  }

  if (organizations.length === 1) {
    ui.info(`Using organization "${organizations[0].name}"`);
    return organizations[0];
  }

  // Multiple orgs
  if (nonInteractive) {
    abort("Multiple organizations found. Pass --org <name> to select one.");
  }
  const selectedId = await promptSelect(
    {
      message: "Select organization:",
      choices: organizations.map((o) => ({
        name: `${ui.shortId(o.id)}  ${o.name}`,
        value: o.id,
      })),
    },
    "Organization selection requires interactive mode.",
  );
  const selected = organizations.find((o) => o.id === selectedId);
  if (!selected) abort("No organization selected.");
  return selected;
}

// ── Vault resolution ──

async function resolveVault(
  opts: InitOptions,
  nonInteractive: boolean,
  orgId: string,
): Promise<{ id: string; name: string }> {
  const vaults = await sdk.getVaults(orgId);

  if (opts.vault) {
    const match = vaults.find((v) => v.name.toLowerCase() === opts.vault!.toLowerCase());
    if (match) return match;
    // Create if not found
    ui.info(`Creating vault "${opts.vault}"...`);
    const vault = await sdk.createVault({ name: opts.vault, organizationId: orgId });
    return vault;
  }

  if (vaults.length === 0) {
    if (nonInteractive) {
      abort("No vaults found. Pass --vault <name> to create one.");
    }
    ui.info("No vaults found. Let's create one.");
    const name = await promptInput(
      { message: "Vault name:", validate: (v: string) => (v.trim() ? true : "Name is required") },
      "Vault name is required.",
    );
    const vault = await sdk.createVault({ name: name.trim(), organizationId: orgId });
    ui.success(`Vault "${vault.name}" created`);
    return vault;
  }

  if (vaults.length === 1) {
    ui.info(`Using vault "${vaults[0].name}"`);
    return vaults[0];
  }

  // Multiple vaults
  if (nonInteractive) {
    abort("Multiple vaults found. Pass --vault <name> to select one.");
  }
  const selectedId = await promptSelect(
    {
      message: "Select vault:",
      choices: vaults.map((v) => ({
        name: `${ui.shortId(v.id)}  ${v.name}${v.description ? ` - ${v.description}` : ""}`,
        value: v.id,
      })),
    },
    "Vault selection requires interactive mode.",
  );
  const selected = vaults.find((v) => v.id === selectedId);
  if (!selected) abort("No vault selected.");
  return selected;
}

// ── Environment creation ──

async function resolveEnvironments(
  opts: InitOptions,
  nonInteractive: boolean,
  vaultId: string,
): Promise<string[]> {
  let envNames: string[] = [];

  if (opts.envs) {
    envNames = opts.envs.split(",").map((e) => e.trim()).filter(Boolean);
  } else if (!nonInteractive) {
    const wantEnvs = await promptConfirm(
      { message: "Would you like to create environments (e.g. dev, staging, prod)?", default: true },
      "",
    );
    if (wantEnvs) {
      const raw = await promptInput(
        { message: "Enter environment names (comma-separated):", default: "dev, staging, prod" },
        "",
      );
      envNames = raw.split(",").map((e) => e.trim()).filter(Boolean);
    }
  }

  if (envNames.length === 0) return [];

  for (const name of envNames) {
    try {
      await sdk.createGroup({ vaultId, name });
      ui.success(`Environment "${name}" created`);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        ui.info(`Environment "${name}" already exists`);
      } else {
        ui.warn(`Failed to create environment "${name}": ${apiErr.message || "unknown error"}`);
      }
    }
  }

  return envNames;
}

// ── .env import ──

async function maybeImportDotEnv(
  nonInteractive: boolean,
  vaultId: string,
  envNames: string[],
): Promise<void> {
  const dotEnvPath = resolve(process.cwd(), ".env");
  if (!existsSync(dotEnvPath)) return;

  if (nonInteractive) return;

  const wantImport = await promptConfirm(
    { message: "Import secrets from .env?", default: false },
    "",
  );
  if (!wantImport) return;

  const content = readFileSync(dotEnvPath, "utf-8");
  const entries = parseDotEnv(content);

  if (entries.length === 0) {
    ui.warn("No secrets found in .env");
    return;
  }

  // Determine target group (first env group, or none)
  let groupId: string | undefined;
  if (envNames.length > 0) {
    const groups = await sdk.getGroups(vaultId);
    const firstGroup = groups.find((g) => g.name === envNames[0]);
    groupId = firstGroup?.id;
  }

  // Resolve a key for the vault
  const keyId = await resolveSecretKeyId(vaultId);

  let imported = 0;
  let skipped = 0;
  for (const { key, value } of entries) {
    try {
      await sdk.createSecret({
        name: key,
        value,
        vaultId,
        keyId,
        groupId,
      });
      imported++;
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        skipped++;
      } else {
        ui.warn(`Failed to import "${key}": ${apiErr.message || "unknown error"}`);
        skipped++;
      }
    }
  }

  ui.success(`Imported ${imported} secret${imported !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped} skipped)` : ""}`);
}

function parseDotEnv(content: string): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) {
      entries.push({ key, value });
    }
  }
  return entries;
}

// ── Config file writing ──

async function writeConfig(
  opts: InitOptions,
  nonInteractive: boolean,
  org: { name: string; slug?: string | null },
  vault: { name: string },
  envNames: string[],
): Promise<void> {
  const existingPath = resolveConfigPath();

  if (existingPath && !opts.force) {
    if (nonInteractive) {
      ui.warn(".hermit.yml already exists. Pass --force to overwrite.");
      return;
    }
    const overwrite = await promptConfirm(
      { message: "A .hermit.yml already exists. Overwrite?", default: false },
      "",
    );
    if (!overwrite) {
      ui.info("Skipping .hermit.yml");
      return;
    }
  }

  const server = authStore.getServerUrl();
  const template = generateTemplate({
    org: org.slug || org.name,
    vault: vault.name,
    environments: envNames,
    defaultEnv: envNames[0],
    server,
  });

  const outPath = resolve(process.cwd(), ".hermit.yml");
  writeFileSync(outPath, template, "utf-8");
  ui.success(`Wrote ${outPath}`);
}
