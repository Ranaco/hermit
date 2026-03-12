import { Command } from "commander";
import * as authStore from "../lib/auth-store.js";
import { requireActiveOrganization, resolveOrganization } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptInput, promptSelect } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
export const orgCommand = new Command("org").description("Manage organizations");
orgCommand
    .command("list")
    .description("List organizations")
    .action(() => runCommand(async () => {
    requireAuth();
    const organizations = await sdk.getOrganizations();
    renderData({ organizations });
    if (organizations.length === 0) {
        ui.warn("No organizations found");
        ui.newline();
        return;
    }
    ui.cards(organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        active: organization.id === authStore.getOrg()?.id,
        badge: organization.userRole ? ui.formatBadge(organization.userRole, "accent") : undefined,
        fields: [
            { label: "Members", value: String(organization._count?.members || 0), overflow: "truncate" },
            { label: "Vaults", value: String(organization._count?.vaults || 0), overflow: "truncate" },
        ],
    })));
}));
orgCommand
    .command("create")
    .description("Create an organization")
    .option("-n, --name <name>", "Organization name")
    .option("-d, --description <description>", "Organization description")
    .action((opts) => runCommand(async () => {
    requireAuth();
    const name = opts.name ||
        (await promptInput({ message: "Organization name:", validate: (value) => (value.trim() ? true : "Name is required") }, "Organization name is required in non-interactive mode."));
    const description = opts.description ||
        (await promptInput({ message: "Description (optional):" }, "Description is required in non-interactive mode."));
    const result = await sdk.createOrganization({
        name: name.trim(),
        description: description.trim() || undefined,
    });
    authStore.saveOrg({
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug || undefined,
    });
    authStore.saveVault({
        id: result.vault.id,
        name: result.vault.name,
        organizationId: result.organization.id,
    });
    renderData(result);
    ui.success(`Organization "${result.organization.name}" created`);
    ui.info(`Default vault "${result.vault.name}" selected`);
    ui.newline();
}));
orgCommand
    .command("select")
    .description("Select an active organization")
    .argument("[query]", "Organization name, full id, or short id")
    .action((query) => runCommand(async () => {
    requireAuth();
    const organizations = await sdk.getOrganizations();
    if (organizations.length === 0) {
        abort("No organizations found.", { suggestions: ["Run: hermes org create"] });
    }
    let organization = query ? await resolveOrganization(query) : undefined;
    if (!organization) {
        const selected = await promptSelect({
            message: "Select organization:",
            choices: organizations.map((item) => ({
                name: `${ui.shortId(item.id)}  ${item.name}${item.userRole ? ` (${item.userRole})` : ""}`,
                value: item.id,
            })),
        }, "Organization selection requires interactive mode or an explicit query.");
        organization = organizations.find((item) => item.id === selected);
    }
    if (!organization) {
        abort("No organization selected.");
    }
    authStore.saveOrg({
        id: organization.id,
        name: organization.name,
        slug: organization.slug || undefined,
    });
    authStore.clearVault();
    renderData({ organization });
    ui.success(`Organization set to ${organization.name}`);
    ui.newline();
}));
orgCommand
    .command("current")
    .description("Show current active organization")
    .action(() => runCommand(async () => {
    requireAuth();
    const organization = await requireActiveOrganization();
    renderData({ organization });
    ui.panel("Organization", [
        ui.kv("Name", ui.colors.primary(organization.name), { overflow: "truncate" }),
        ui.kv("ID", ui.colors.cyan(organization.id), { overflow: "truncate" }),
        ui.kv("Role", ui.colors.primary(organization.userRole || "member"), { overflow: "truncate" }),
    ]);
    ui.newline();
}));
