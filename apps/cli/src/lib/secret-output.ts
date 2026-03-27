import { isJsonMode, isPlainMode, isRawMode } from "./runtime.js";
import * as sdk from "./sdk.js";
import * as ui from "./ui.js";

export function renderSecretValueOutput(revealed: sdk.SecretRevealResult): void {
  if (isJsonMode()) {
    return;
  }

  if (isRawMode() || (!process.stdout.isTTY && isPlainMode())) {
    process.stdout.write(revealed.secret.value);
    return;
  }

  ui.panel(revealed.secret.name, [
    ui.kv("Value", ui.formatSecretValue(revealed.secret.value, "plain"), { overflow: "wrap" }),
    ui.spacer(),
    ui.kv("Version", ui.colors.primary(`v${revealed.secret.versionNumber}`)),
    ui.kv("Updated", ui.formatDateTime(revealed.secret.updatedAt), { overflow: "wrap" }),
  ]);
}

export function renderSecretListOutput(
  vault: sdk.VaultSummary,
  group: sdk.GroupSummary | undefined,
  childGroups: sdk.GroupSummary[],
  secrets: sdk.SecretSummary[],
): void {
  if (isJsonMode()) {
    return;
  }

  if (isRawMode()) {
    for (const childGroup of childGroups) {
      process.stdout.write(`${childGroup.name}/\n`);
    }
    for (const secret of secrets) {
      process.stdout.write(`${secret.name}\n`);
    }
    return;
  }

  const label = group ? `${vault.name} / ${group.name}` : vault.name;
  if (childGroups.length === 0 && secrets.length === 0) {
    ui.info(label);
    ui.warn("No secrets or groups found");
    ui.newline();
    return;
  }

  const treeItems: ui.TreeListingItem[] = [
    ...childGroups.map((childGroup) => ({
      id: childGroup.id,
      name: childGroup.name,
      isGroup: true,
      meta: `${childGroup._count?.secrets ?? 0} secrets · ${childGroup._count?.children ?? 0} groups`,
    })),
    ...secrets.map((secret) => ({
      id: secret.id,
      name: secret.name,
      isGroup: false,
      meta: `${secret.valueType || "STRING"}  v${secret.currentVersion?.versionNumber || 1}`,
    })),
  ];
  ui.treeListing(label, treeItems);
}
