"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Code2,
  FolderTree,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useSecretGroups } from "@/hooks/use-secret-groups";
import { useSecrets } from "@/hooks/use-secrets";
import { useVaults } from "@/hooks/use-vaults";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationStore } from "@/store/organization.store";
import { cn } from "@/lib/utils";

type PolicyEditorMode = "builder" | "raw";
type BuilderScope = "workspace" | "vault" | "folderSubtree" | "specificSecrets";
type ResourceKind = "invitation" | "vault" | "key" | "secret" | "group";

type PolicyActionOption = {
  action: string;
  label: string;
  description: string;
};

export type PolicyScopeGroup = {
  prefix: string;
  category: string;
  description: string;
  resourceKind: ResourceKind;
  supportedScopes: BuilderScope[];
  scopes: PolicyActionOption[];
};

type VisualPolicyStatement = {
  effect?: string;
  actions?: string[];
  resources?: string[];
};

type BuilderRule = {
  id: string;
  groupPrefix: string;
  scope: BuilderScope;
  vaultId?: string;
  groupId?: string;
  secretIds?: string[];
  actions: string[];
};

type ParsedPolicyState = {
  isValid: boolean;
  isComplex: boolean;
  rules: BuilderRule[];
};

const ORG_RESOURCE_PATTERNS = {
  invitationWorkspace: /^urn:hermit:org:([^:]+):invitation:\*$/,
  vaultWorkspace: /^urn:hermit:org:([^:]+):vault:\*$/,
  vaultExact: /^urn:hermit:org:([^:]+):vault:([^:]+)$/,
  keyWorkspace: /^urn:hermit:org:([^:]+):vault:\*:key:\*$/,
  keyVault: /^urn:hermit:org:([^:]+):vault:([^:]+):key:\*$/,
  secretWorkspace: /^urn:hermit:org:([^:]+):vault:\*:secret:\*$/,
  secretVault: /^urn:hermit:org:([^:]+):vault:([^:]+):secret:\*$/,
  secretExact: /^urn:hermit:org:([^:]+):vault:([^:]+):secret:([^:]+)$/,
  groupWorkspace: /^urn:hermit:org:([^:]+):vault:\*:group:\*$/,
  groupVault: /^urn:hermit:org:([^:]+):vault:([^:]+):group:\*$/,
  groupSubtree: /^urn:hermit:org:([^:]+):vault:([^:]+):group:([^:]+):subtree$/,
} as const;

export const POLICY_SCOPE_GROUPS: PolicyScopeGroup[] = [
  {
    prefix: "organizations:invitations",
    category: "Organization Invitations",
    description: "Pending invite visibility and invite lifecycle control",
    resourceKind: "invitation",
    supportedScopes: ["workspace"],
    scopes: [
      {
        action: "organizations:invitations:read",
        label: "Read Invitations",
        description: "View pending invitations in the current organization",
      },
      {
        action: "organizations:invitations:create",
        label: "Create Invitations",
        description: "Send invite links into the organization",
      },
      {
        action: "organizations:invitations:revoke",
        label: "Revoke Invitations",
        description: "Disable pending invitation links",
      },
    ],
  },
  {
    prefix: "vaults",
    category: "Vaults",
    description: "Vault lifecycle and vault settings",
    resourceKind: "vault",
    supportedScopes: ["workspace", "vault"],
    scopes: [
      { action: "vaults:read", label: "Read Vaults", description: "View vaults and metadata" },
      { action: "vaults:create", label: "Create Vaults", description: "Provision new vaults" },
      { action: "vaults:update", label: "Update Vaults", description: "Edit vault settings" },
      { action: "vaults:delete", label: "Delete Vaults", description: "Remove vaults permanently" },
    ],
  },
  {
    prefix: "secrets",
    category: "Secrets",
    description: "Secret reveal, mutation, and lifecycle control",
    resourceKind: "secret",
    supportedScopes: ["workspace", "vault", "folderSubtree"],
    scopes: [
      { action: "secrets:read", label: "Read Secrets", description: "View secret metadata and versions" },
      { action: "secrets:create", label: "Create Secrets", description: "Create new secrets" },
      { action: "secrets:update", label: "Update Secrets", description: "Rotate or edit existing secrets" },
      { action: "secrets:delete", label: "Delete Secrets", description: "Remove secrets from a vault" },
      { action: "secrets:use", label: "Use Secrets", description: "Reveal and consume secret values" },
    ],
  },
  {
    prefix: "keys",
    category: "Keys",
    description: "Transit keys and encryption operations",
    resourceKind: "key",
    supportedScopes: ["workspace", "vault"],
    scopes: [
      { action: "keys:read", label: "Read Keys", description: "View key metadata and versions" },
      { action: "keys:create", label: "Create Keys", description: "Generate new transit keys" },
      { action: "keys:update", label: "Rotate Keys", description: "Rotate existing keys" },
      { action: "keys:delete", label: "Delete Keys", description: "Destroy keys permanently" },
      { action: "keys:use", label: "Use Keys", description: "Encrypt and decrypt with assigned keys" },
    ],
  },
  {
    prefix: "groups",
    category: "Folders",
    description: "Secret group structure inside vaults",
    resourceKind: "group",
    supportedScopes: ["workspace", "vault", "folderSubtree"],
    scopes: [
      { action: "groups:read", label: "Read Folders", description: "View folder structure" },
      { action: "groups:create", label: "Create Folders", description: "Create new folders" },
      { action: "groups:update", label: "Update Folders", description: "Rename and edit folders" },
      { action: "groups:delete", label: "Delete Folders", description: "Delete folders" },
    ],
  },
];

const EMPTY_POLICY = JSON.stringify([], null, 2);

function createRuleId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function getScopeGroup(prefix: string) {
  return POLICY_SCOPE_GROUPS.find((group) => group.prefix === prefix);
}

function getGroupByAction(action: string) {
  const normalizedAction = action.endsWith(":*") ? action.slice(0, -2) : action;

  return POLICY_SCOPE_GROUPS.find(
    (group) =>
      normalizedAction === group.prefix ||
      group.scopes.some((scope) => scope.action === normalizedAction),
  );
}

function expandStatementActions(statement: VisualPolicyStatement, group: PolicyScopeGroup) {
  const nextActions = new Set<string>();

  for (const action of statement.actions ?? []) {
    if (action === `${group.prefix}:*`) {
      group.scopes.forEach((scope) => nextActions.add(scope.action));
      continue;
    }

    nextActions.add(action);
  }

  return Array.from(nextActions);
}

function compressRuleActions(rule: BuilderRule, group: PolicyScopeGroup) {
  const nextActions = Array.from(new Set(rule.actions));
  const hasAllActions = group.scopes.every((scope) => nextActions.includes(scope.action));

  if (hasAllActions) {
    return [`${group.prefix}:*`];
  }

  return nextActions;
}

function getScopeLabel(scope: BuilderScope) {
  if (scope === "workspace") {
    return "Workspace";
  }
  if (scope === "vault") {
    return "Vault";
  }
  if (scope === "specificSecrets") {
    return "Specific secrets";
  }
  return "Folder subtree";
}

function getRuleResources(rule: BuilderRule, group: PolicyScopeGroup, orgId: string) {
  if (rule.scope === "workspace") {
    if (group.resourceKind === "invitation") {
      return [`urn:hermit:org:${orgId}:invitation:*`];
    }

    if (group.resourceKind === "vault") {
      return [`urn:hermit:org:${orgId}:vault:*`];
    }

    if (group.resourceKind === "key") {
      return [`urn:hermit:org:${orgId}:vault:*:key:*`];
    }

    if (group.resourceKind === "secret") {
      return [`urn:hermit:org:${orgId}:vault:*:secret:*`];
    }

    return [`urn:hermit:org:${orgId}:vault:*:group:*`];
  }

  if (rule.scope === "vault") {
    if (!rule.vaultId) {
      return null;
    }

    if (group.resourceKind === "vault") {
      return [`urn:hermit:org:${orgId}:vault:${rule.vaultId}`];
    }

    if (group.resourceKind === "key") {
      return [`urn:hermit:org:${orgId}:vault:${rule.vaultId}:key:*`];
    }

    if (group.resourceKind === "secret") {
      return [`urn:hermit:org:${orgId}:vault:${rule.vaultId}:secret:*`];
    }

    if (group.resourceKind === "group") {
      return [`urn:hermit:org:${orgId}:vault:${rule.vaultId}:group:*`];
    }

    return null;
  }

  if (rule.scope === "specificSecrets") {
    if (!rule.vaultId || !rule.secretIds || rule.secretIds.length === 0) {
      return null;
    }

    return rule.secretIds.map(
      (secretId) => `urn:hermit:org:${orgId}:vault:${rule.vaultId}:secret:${secretId}`,
    );
  }

  if (!rule.vaultId || !rule.groupId) {
    return null;
  }

  return [`urn:hermit:org:${orgId}:vault:${rule.vaultId}:group:${rule.groupId}:subtree`];
}

function parseRuleScope(group: PolicyScopeGroup, resources: string[]) {
  if (
    group.resourceKind === "secret" &&
    resources.length > 0 &&
    resources.every((resource) => ORG_RESOURCE_PATTERNS.secretExact.test(resource))
  ) {
    const exactMatches = resources.map((resource) => resource.match(ORG_RESOURCE_PATTERNS.secretExact));
    const vaultId = exactMatches[0]?.[2];

    if (!vaultId || exactMatches.some((match) => !match || match[2] !== vaultId)) {
      return null;
    }

    return {
      scope: "specificSecrets" as const,
      vaultId,
      secretIds: exactMatches.map((match) => match![3]),
    };
  }

  if (resources.length !== 1) {
    return null;
  }

  const [resource] = resources;
  if (resource === "*") {
    return { scope: "workspace" as const };
  }

  if (group.resourceKind === "invitation") {
    if (ORG_RESOURCE_PATTERNS.invitationWorkspace.test(resource)) {
      return { scope: "workspace" as const };
    }
    return null;
  }

  if (group.resourceKind === "vault") {
    const workspaceMatch = resource.match(ORG_RESOURCE_PATTERNS.vaultWorkspace);
    if (workspaceMatch) {
      return { scope: "workspace" as const };
    }

    const vaultMatch = resource.match(ORG_RESOURCE_PATTERNS.vaultExact);
    if (vaultMatch) {
      return { scope: "vault" as const, vaultId: vaultMatch[2] };
    }

    return null;
  }

  if (group.resourceKind === "key") {
    const workspaceMatch = resource.match(ORG_RESOURCE_PATTERNS.keyWorkspace);
    if (workspaceMatch) {
      return { scope: "workspace" as const };
    }

    const vaultMatch = resource.match(ORG_RESOURCE_PATTERNS.keyVault);
    if (vaultMatch) {
      return { scope: "vault" as const, vaultId: vaultMatch[2] };
    }

    return null;
  }

  if (group.resourceKind === "secret") {
    const workspaceMatch = resource.match(ORG_RESOURCE_PATTERNS.secretWorkspace);
    if (workspaceMatch) {
      return { scope: "workspace" as const };
    }

    const vaultMatch = resource.match(ORG_RESOURCE_PATTERNS.secretVault);
    if (vaultMatch) {
      return { scope: "vault" as const, vaultId: vaultMatch[2] };
    }

    const folderMatch = resource.match(ORG_RESOURCE_PATTERNS.groupSubtree);
    if (folderMatch) {
      return { scope: "folderSubtree" as const, vaultId: folderMatch[2], groupId: folderMatch[3] };
    }

    return null;
  }

  const workspaceMatch = resource.match(ORG_RESOURCE_PATTERNS.groupWorkspace);
  if (workspaceMatch) {
    return { scope: "workspace" as const };
  }

  const vaultMatch = resource.match(ORG_RESOURCE_PATTERNS.groupVault);
  if (vaultMatch) {
    return { scope: "vault" as const, vaultId: vaultMatch[2] };
  }

  const folderMatch = resource.match(ORG_RESOURCE_PATTERNS.groupSubtree);
  if (folderMatch) {
    return { scope: "folderSubtree" as const, vaultId: folderMatch[2], groupId: folderMatch[3] };
  }

  return null;
}

function parsePolicyState(value: string): ParsedPolicyState {
  try {
    const statements = JSON.parse(value) as VisualPolicyStatement[];
    if (!Array.isArray(statements)) {
      return { isValid: false, isComplex: true, rules: [] };
    }

    const rules: BuilderRule[] = [];

    for (const statement of statements) {
      const statementActions = statement.actions ?? [];
      const statementResources = statement.resources ?? [];

      if (statement.effect !== "ALLOW") {
        return { isValid: true, isComplex: true, rules: [] };
      }

      if (statementActions.length === 0) {
        continue;
      }

      const groupedActions = new Map<string, string[]>();

      for (const action of statementActions) {
        const group = getGroupByAction(action);
        if (!group) {
          return { isValid: true, isComplex: true, rules: [] };
        }

        groupedActions.set(group.prefix, [
          ...(groupedActions.get(group.prefix) ?? []),
          action,
        ]);
      }

      const actionGroups = Array.from(groupedActions.keys());
      const canSplitMixedWildcardStatement =
        actionGroups.length > 1 &&
        statementResources.length === 1 &&
        statementResources[0] === "*";

      if (actionGroups.length > 1 && !canSplitMixedWildcardStatement) {
        return { isValid: true, isComplex: true, rules: [] };
      }

      for (const groupPrefix of actionGroups) {
        const group = getScopeGroup(groupPrefix);
        if (!group) {
          return { isValid: true, isComplex: true, rules: [] };
        }

        const scopedStatement: VisualPolicyStatement = {
          ...statement,
          actions: groupedActions.get(groupPrefix) ?? [],
        };

        const scope = parseRuleScope(group, statementResources);
        if (!scope) {
          return { isValid: true, isComplex: true, rules: [] };
        }

        const expandedActions = expandStatementActions(scopedStatement, group);
        if (expandedActions.some((action) => !group.scopes.some((scopeOption) => scopeOption.action === action))) {
          return { isValid: true, isComplex: true, rules: [] };
        }

        rules.push({
          id: createRuleId(),
          groupPrefix: group.prefix,
          scope: scope.scope,
          vaultId: scope.vaultId,
          groupId: scope.groupId,
          secretIds: "secretIds" in scope ? scope.secretIds : undefined,
          actions: expandedActions,
        });
      }
    }

    return {
      isValid: true,
      isComplex: false,
      rules,
    };
  } catch {
    return { isValid: false, isComplex: true, rules: [] };
  }
}

function serializeBuilderRules(rules: BuilderRule[], orgId: string) {
  const statements = rules
    .map((rule) => {
      const group = getScopeGroup(rule.groupPrefix);
      if (!group) {
        return null;
      }

      const resources = getRuleResources(rule, group, orgId);
      if (!resources || rule.actions.length === 0) {
        return null;
      }

      return {
        effect: "ALLOW" as const,
        actions: compressRuleActions(rule, group),
        resources,
      };
    })
    .filter((statement): statement is { effect: "ALLOW"; actions: string[]; resources: string[] } => !!statement);

  return JSON.stringify(statements, null, 2);
}

function createEmptyRule(defaultVaultId?: string) {
  return {
    id: createRuleId(),
    groupPrefix: "secrets",
    scope: "workspace" as const,
    vaultId: defaultVaultId,
    secretIds: [],
    actions: ["secrets:read"],
  };
}

function remapActionsToGroup(actions: string[], nextGroup: PolicyScopeGroup) {
  const nextActionSuffixMap = new Map(
    nextGroup.scopes.map((scope) => [scope.action.split(":").at(-1) ?? scope.action, scope.action]),
  );

  const remappedActions = actions
    .map((action) => {
      const suffix = action.split(":").at(-1) ?? action;
      return nextActionSuffixMap.get(suffix);
    })
    .filter((action): action is string => !!action);

  if (remappedActions.length > 0) {
    return Array.from(new Set(remappedActions));
  }

  const preferredFallback =
    nextGroup.scopes.find((scope) => scope.action.endsWith(":read"))?.action ??
    nextGroup.scopes[0]?.action;

  return preferredFallback ? [preferredFallback] : [];
}

type PolicyEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
};

export function PolicyEditor({
  value,
  onChange,
  readOnly = false,
}: PolicyEditorProps) {
  const [mode, setMode] = useState<PolicyEditorMode>("builder");
  const parsedState = useMemo(() => parsePolicyState(value), [value]);
  const { currentOrganization, currentVault } = useOrganizationStore();
  const { data: vaults = [] } = useVaults(currentOrganization?.id);
  const [builderRules, setBuilderRules] = useState<BuilderRule[]>(() => parsedState.rules);
  const lastSerializedValueRef = useRef(value);

  useEffect(() => {
    if (mode === "builder" && parsedState.isComplex && parsedState.isValid) {
      setMode("raw");
    }
  }, [mode, parsedState.isComplex, parsedState.isValid]);

  useEffect(() => {
    if (value !== lastSerializedValueRef.current) {
      setBuilderRules(parsedState.rules);
      lastSerializedValueRef.current = value;
    }
  }, [parsedState.rules, value]);

  const updateRules = (nextRules: BuilderRule[]) => {
    setBuilderRules(nextRules);

    if (!onChange || !currentOrganization?.id) {
      return;
    }

    const serializedRules = serializeBuilderRules(nextRules, currentOrganization.id);
    lastSerializedValueRef.current = serializedRules;
    onChange(serializedRules);
  };

  const addRule = () => {
    updateRules([
      ...builderRules,
      createEmptyRule(currentVault?.id ?? vaults[0]?.id),
    ]);
  };

  return (
    <Tabs
      value={mode}
      onValueChange={(nextMode) => setMode(nextMode as PolicyEditorMode)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <TabsList className="mb-5 grid w-full shrink-0 grid-cols-2 rounded-full border border-border bg-muted/40 p-1">
        <TabsTrigger value="builder" disabled={parsedState.isComplex && parsedState.isValid} className="rounded-full">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Builder
        </TabsTrigger>
        <TabsTrigger value="raw" className="rounded-full">
          <Code2 className="mr-2 h-4 w-4" />
          Raw
        </TabsTrigger>
      </TabsList>

      <TabsContent value="builder" className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        {(!parsedState.isValid || parsedState.isComplex) ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Builder unavailable</AlertTitle>
            <AlertDescription>
              {parsedState.isValid
                ? "This policy uses DENY rules or unsupported resource shapes. Open Raw to review or edit it."
                : "The raw policy JSON is invalid. Fix it in Raw before returning to the builder."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Scoped allow rules</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create workspace-wide, vault-wide, or folder-subtree grants without writing URNs.
                </p>
              </div>
              {!readOnly ? (
                <Button type="button" variant="outline" onClick={addRule}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {builderRules.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-border bg-muted/10 px-5 py-8 text-center">
                  <FolderTree className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium text-foreground">No rules yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a rule to grant access at the workspace, vault, or folder level.
                  </p>
                </div>
              ) : (
                builderRules.map((rule) => (
                  <BuilderRuleCard
                    key={rule.id}
                    rule={rule}
                    vaults={vaults}
                    readOnly={readOnly}
                    onChange={(nextRule) =>
                      updateRules(builderRules.map((currentRule) => (currentRule.id === rule.id ? nextRule : currentRule)))
                    }
                    onDelete={() =>
                      updateRules(builderRules.filter((currentRule) => currentRule.id !== rule.id))
                    }
                  />
                ))
              )}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {!parsedState.isValid && (value || "").length > 2 ? (
            <Alert variant="destructive" className="shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid JSON</AlertTitle>
              <AlertDescription>Fix the syntax before saving this policy.</AlertDescription>
            </Alert>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-muted/20">
            <Textarea
              value={value || EMPTY_POLICY}
              onChange={(event) => onChange?.(event.target.value)}
              className="h-full min-h-[360px] resize-y overflow-y-auto rounded-[12px] border-0 bg-transparent px-4 py-4 font-mono text-[13px] leading-7 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={EMPTY_POLICY}
              readOnly={readOnly}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function BuilderRuleCard({
  rule,
  vaults,
  readOnly,
  onChange,
  onDelete,
}: {
  rule: BuilderRule;
  vaults: Array<{ id: string; name: string }>;
  readOnly: boolean;
  onChange: (rule: BuilderRule) => void;
  onDelete: () => void;
}) {
  const group = getScopeGroup(rule.groupPrefix);
  const supportsFolder = group?.supportedScopes.includes("folderSubtree") ?? false;
  const supportsSpecificSecrets = group?.resourceKind === "secret";
  const selectableVaultId =
    supportsFolder || supportsSpecificSecrets ? rule.vaultId ?? vaults[0]?.id : undefined;
  const { data: groupResponse } = useSecretGroups(
    selectableVaultId,
    undefined,
    true,
    true,
  );
  const { data: secretsResponse } = useSecrets(
    supportsSpecificSecrets && selectableVaultId ? selectableVaultId : undefined,
  );

  if (!group) {
    return null;
  }

  const groups = (groupResponse?.data ?? []).slice().sort((left, right) => {
    if (left.depth === right.depth) {
      return left.name.localeCompare(right.name);
    }

    return left.depth - right.depth;
  });
  const secrets = (secretsResponse?.secrets ?? []).slice().sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  useEffect(() => {
    if (readOnly || rule.scope !== "folderSubtree" || !selectableVaultId) {
      return;
    }

    if (rule.groupId && groups.some((groupOption) => groupOption.id === rule.groupId)) {
      return;
    }

    const fallbackGroupId = groups[0]?.id;
    if (!fallbackGroupId) {
      return;
    }

    onChange({
      ...rule,
      vaultId: selectableVaultId,
      groupId: fallbackGroupId,
    });
  }, [
    groups,
    onChange,
    readOnly,
    rule,
    selectableVaultId,
  ]);

  const supportsVault = group.supportedScopes.includes("vault");

  return (
    <section className="rounded-[18px] border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="grid min-w-[180px] gap-2">
          <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Resource Type</Label>
          <Select
            value={rule.groupPrefix}
            onValueChange={(nextPrefix) => {
              const nextGroup = getScopeGroup(nextPrefix);
              if (!nextGroup) {
                return;
              }

              const nextScope = nextGroup.supportedScopes.includes(rule.scope) ? rule.scope : "workspace";

                onChange({
                  ...rule,
                  groupPrefix: nextPrefix,
                  scope: nextScope,
                  vaultId: nextScope === "workspace" ? undefined : rule.vaultId ?? vaults[0]?.id,
                  groupId: nextScope === "folderSubtree" ? rule.groupId : undefined,
                  secretIds: nextScope === "specificSecrets" ? rule.secretIds ?? [] : undefined,
                  actions: remapActionsToGroup(rule.actions, nextGroup),
                });
            }}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLICY_SCOPE_GROUPS.map((scopeGroup) => (
                <SelectItem key={scopeGroup.prefix} value={scopeGroup.prefix}>
                  {scopeGroup.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-[180px] gap-2">
          <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Scope</Label>
          <Select
            value={rule.scope}
              onValueChange={(nextScope) =>
                onChange({
                  ...rule,
                  scope: nextScope as BuilderScope,
                  groupId:
                    nextScope === "folderSubtree"
                      ? rule.groupId ?? groups[0]?.id
                    : undefined,
                  secretIds:
                    nextScope === "specificSecrets"
                      ? rule.secretIds ?? []
                      : undefined,
                  vaultId:
                    nextScope === "workspace"
                      ? undefined
                    : rule.vaultId ?? vaults[0]?.id,
                })
            }
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace">Workspace</SelectItem>
              {supportsVault ? <SelectItem value="vault">Vault</SelectItem> : null}
              {supportsFolder ? <SelectItem value="folderSubtree">Folder subtree</SelectItem> : null}
              {supportsSpecificSecrets ? <SelectItem value="specificSecrets">Specific secrets</SelectItem> : null}
            </SelectContent>
          </Select>
        </div>

        {rule.scope !== "workspace" ? (
          <div className="grid min-w-[180px] flex-1 gap-2">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Vault</Label>
            <Select
              value={rule.vaultId}
              onValueChange={(nextVaultId) =>
                onChange({
                  ...rule,
                  vaultId: nextVaultId,
                  groupId: rule.scope === "folderSubtree" ? undefined : rule.groupId,
                  secretIds: rule.scope === "specificSecrets" ? [] : rule.secretIds,
                })
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vault" />
              </SelectTrigger>
              <SelectContent>
                {vaults.map((vault) => (
                  <SelectItem key={vault.id} value={vault.id}>
                    {vault.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {rule.scope === "folderSubtree" ? (
          <div className="grid min-w-[220px] flex-1 gap-2">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Folder</Label>
            <Select
              value={rule.groupId}
              onValueChange={(nextGroupId) =>
                onChange({
                  ...rule,
                  groupId: nextGroupId,
                })
              }
              disabled={readOnly || !rule.vaultId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select folder subtree" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((groupOption) => (
                  <SelectItem key={groupOption.id} value={groupOption.id}>
                    {`${"  ".repeat(groupOption.depth)}${groupOption.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {group.resourceKind === "secret"
                ? "Applies to secrets inside this folder and everything below it."
                : "Applies to this folder tree and the folders inside it."}
            </p>
          </div>
        ) : null}

        {rule.scope === "specificSecrets" ? (
          <div className="min-w-[260px] flex-1">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Secrets</Label>
            <div className="mt-2 rounded-[12px] border border-border bg-muted/10">
              <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                Select one or more secrets in this vault.
              </div>
              <div className="max-h-52 overflow-y-auto">
                {secrets.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    No readable secrets in this vault yet.
                  </div>
                ) : (
                  secrets.map((secret) => {
                    const checked = rule.secretIds?.includes(secret.id) ?? false;
                    return (
                      <label
                        key={secret.id}
                        className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-3 last:border-b-0"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            const nextSecretIds = nextChecked
                              ? Array.from(new Set([...(rule.secretIds ?? []), secret.id]))
                              : (rule.secretIds ?? []).filter((secretId) => secretId !== secret.id);

                            onChange({
                              ...rule,
                              secretIds: nextSecretIds,
                            });
                          }}
                          disabled={readOnly}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{secret.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {secret.secretGroup?.name ?? "Root"} / {secret.id.slice(0, 8)}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {rule.secretIds?.length
                ? `${rule.secretIds.length} secret${rule.secretIds.length === 1 ? "" : "s"} selected.`
                : "Choose the exact secrets this rule should grant."}
            </p>
          </div>
        ) : null}

        {!readOnly ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-10 w-10 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="border-b border-border px-5 py-3">
        <p className="text-sm font-medium text-foreground">{group.category}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {group.description} · {getScopeLabel(rule.scope)}
        </p>
      </div>

      <div className="divide-y divide-border">
        {group.scopes.map((scope) => {
          const granted = rule.actions.includes(scope.action);

          return (
            <div key={scope.action} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Label htmlFor={`${rule.id}-${scope.action}`} className="text-sm font-medium text-foreground">
                  {scope.label}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">{scope.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "min-w-[84px] text-right text-xs font-medium uppercase tracking-[0.14em]",
                    granted ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {granted ? "Granted" : "Not given"}
                </span>
                <Switch
                  id={`${rule.id}-${scope.action}`}
                  checked={granted}
                  onCheckedChange={(checked) => {
                    const nextActions = checked
                      ? [...rule.actions, scope.action]
                      : rule.actions.filter((action) => action !== scope.action);

                    onChange({
                      ...rule,
                      actions: Array.from(new Set(nextActions)),
                    });
                  }}
                  disabled={readOnly}
                  aria-label={scope.label}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
