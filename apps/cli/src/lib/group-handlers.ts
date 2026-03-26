import { requireActiveVault, resolveGroupByPath, resolveVault } from "./context.js";
import { renderData, requireAuth } from "./command-helpers.js";
import * as sdk from "./sdk.js";
import * as ui from "./ui.js";

export interface GroupTreeParams {
  vaultQuery?: string;
  pathQuery?: string;
}

async function renderGroupTree(vaultId: string, parentId?: string | null): Promise<ui.NestedTreeItem[]> {
  const groups = await sdk.getGroups(vaultId, parentId ? { parentId } : {});
  const nodes: ui.NestedTreeItem[] = [];
  for (const group of groups) {
    nodes.push({
      id: group.id,
      name: group.name,
      isGroup: true,
      meta: `${group._count?.secrets ?? 0} secrets · ${group._count?.children ?? 0} groups`,
      children: await renderGroupTree(vaultId, group.id),
    });
  }
  return nodes;
}

async function renderGroupLines(vaultId: string, parentId?: string | null, prefix = ""): Promise<string[]> {
  const groups = await sdk.getGroups(vaultId, parentId ? { parentId } : {});
  const lines: string[] = [];
  for (const group of groups) {
    lines.push(`${prefix}${group.name}`);
    lines.push(...(await renderGroupLines(vaultId, group.id, `${prefix}  `)));
  }
  return lines;
}

export async function handleGroupTree(params: GroupTreeParams): Promise<void> {
  requireAuth();
  const vault = params.vaultQuery ? await resolveVault(params.vaultQuery) : await requireActiveVault();
  const rootGroup = params.pathQuery ? await resolveGroupByPath(vault.id, params.pathQuery) : undefined;

  if (params.pathQuery) {
    const lines = await renderGroupLines(vault.id, rootGroup?.id);
    renderData({ vault, tree: lines });
    if (lines.length === 0) {
      ui.warn("No groups found");
      ui.newline();
      return;
    }
    const label = `Groups - ${vault.name} / ${params.pathQuery}`;
    ui.listPanel(label, lines);
    ui.newline();
    return;
  }

  const nodes = await renderGroupTree(vault.id);
  renderData({ vault, tree: nodes });
  if (nodes.length === 0) {
    ui.warn("No groups found");
    ui.newline();
    return;
  }
  ui.nestedTreeListing(vault.name, nodes);
}
