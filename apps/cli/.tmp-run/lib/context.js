import * as sdk from "./sdk.js";
import * as authStore from "./auth-store.js";
import { abort } from "./command-helpers.js";
import { matchId, shortId } from "./ui.js";
function exactNameMatch(items, query) {
    return items.find((item) => item.name.toLowerCase() === query.toLowerCase());
}
function shortIdMatch(items, query) {
    if (query.length < 4)
        return undefined;
    const matches = items.filter((item) => matchId(query, item.id));
    return matches.length === 1 ? matches[0] : undefined;
}
export function findByIdOrName(items, query) {
    return exactNameMatch(items, query) || shortIdMatch(items, query) || items.find((item) => item.id === query);
}
export async function requireOrganizations() {
    return sdk.getOrganizations();
}
export async function requireActiveOrganization() {
    const organizations = await sdk.getOrganizations();
    const current = authStore.getOrg();
    if (current?.id) {
        const match = organizations.find((organization) => organization.id === current.id);
        if (match) {
            return match;
        }
    }
    if (organizations.length === 0) {
        abort("No organizations found.", { suggestions: ["Run: hermes org create"] });
    }
    if (organizations.length === 1) {
        const organization = organizations[0];
        authStore.saveOrg({ id: organization.id, name: organization.name, slug: organization.slug || undefined });
        authStore.clearVault();
        return organization;
    }
    abort("No active organization selected.", {
        suggestions: ["Run: hermes org select <org>"],
        details: { organizations: organizations.map((organization) => ({ id: organization.id, name: organization.name })) },
    });
}
export async function resolveOrganization(query) {
    if (!query) {
        return requireActiveOrganization();
    }
    const organizations = await sdk.getOrganizations();
    const match = findByIdOrName(organizations, query);
    if (!match) {
        throw new Error(`No organization matches "${query}".`);
    }
    return match;
}
export async function requireActiveVault(organizationQuery) {
    const organization = await resolveOrganization(organizationQuery);
    const vaults = await sdk.getVaults(organization.id);
    const currentVaultId = authStore.getVaultId();
    if (currentVaultId) {
        const current = vaults.find((vault) => vault.id === currentVaultId);
        if (current) {
            return current;
        }
    }
    if (vaults.length === 0) {
        throw new Error("No vaults found. Create one with `hermes vault create`.");
    }
    if (vaults.length === 1) {
        authStore.saveVault({
            id: vaults[0].id,
            name: vaults[0].name,
            organizationId: vaults[0].organizationId,
        });
        return vaults[0];
    }
    abort("No active vault selected.", {
        suggestions: ["Run: hermes vault select <vault>"],
        details: { vaults: vaults.map((vault) => ({ id: vault.id, name: vault.name })) },
    });
}
export async function resolveVault(query, options = {}) {
    const organization = await resolveOrganization(options.organizationQuery);
    const vaults = await sdk.getVaults(organization.id);
    if (!query) {
        return requireActiveVault(organization.id);
    }
    const match = findByIdOrName(vaults, query);
    if (!match) {
        throw new Error(`No vault matches "${query}".`);
    }
    return match;
}
export async function resolveGroupByPath(vaultId, pathValue) {
    const segments = pathValue.split("/").map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
        throw new Error("Secret group path is empty.");
    }
    let parentId = null;
    let current;
    for (const segment of segments) {
        const groups = await sdk.getSecretGroups(vaultId, parentId ? { parentId } : {});
        current = groups.find((group) => group.name.toLowerCase() === segment.toLowerCase());
        if (!current) {
            throw new Error(`No secret group path matches "${pathValue}".`);
        }
        parentId = current.id;
    }
    if (!current) {
        throw new Error(`No secret group path matches "${pathValue}".`);
    }
    return current;
}
export async function resolveGroup(vaultId, query, pathValue) {
    if (pathValue) {
        return resolveGroupByPath(vaultId, pathValue);
    }
    if (!query) {
        return undefined;
    }
    const rootGroups = await sdk.getSecretGroups(vaultId);
    const direct = findByIdOrName(rootGroups, query);
    if (direct) {
        return direct;
    }
    const queue = [...rootGroups];
    while (queue.length > 0) {
        const group = queue.shift();
        if (group.id === query || shortId(group.id) === query) {
            return group;
        }
        const children = await sdk.getSecretGroups(vaultId, { parentId: group.id });
        const byName = children.find((item) => item.name.toLowerCase() === query.toLowerCase());
        if (byName) {
            return byName;
        }
        queue.push(...children);
    }
    throw new Error(`No secret group matches "${query}".`);
}
