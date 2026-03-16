"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Building2,
  Eye,
  FileCode2,
  LockKeyhole,
  PencilLine,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { POLICY_SCOPE_GROUPS, PolicyEditor } from "@/components/policy-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreatePolicy,
  useCreateRole,
  useDeletePolicy,
  usePolicies,
  useRoles,
  useUpdatePolicy,
  useUpdateRole,
} from "@/hooks/use-policies";
import { useRBAC } from "@/hooks/use-rbac";
import {
  type OrganizationRole,
  type Policy,
  type PolicyStatement,
} from "@/services/policy.service";
import { useOrganizationStore } from "@/store/organization.store";

const EMPTY_POLICY_JSON = JSON.stringify([], null, 2);

const ACTION_LABELS = new Map(
  POLICY_SCOPE_GROUPS.flatMap((group) =>
    group.scopes.map((scope) => [scope.action, scope.label] as const),
  ),
);

function summarizePolicy(policy: Policy) {
  const statements = policy.document?.statements ?? [];
  const actions = Array.from(
    new Set(statements.flatMap((statement) => statement.actions ?? [])),
  );

  return {
    statementCount: statements.length,
    actionCount: actions.length,
    preview: actions.map((action) => {
      if (action === "*") {
        return "Full access";
      }

      if (action.endsWith(":*")) {
        const group = POLICY_SCOPE_GROUPS.find((item) => `${item.prefix}:*` === action);
        return group ? `${group.category} Full Access` : action;
      }

      return ACTION_LABELS.get(action) ?? action;
    }),
  };
}

export default function PoliciesPage() {
  const { currentOrganization } = useOrganizationStore();
  const permissions = useRBAC();
  const canAccessPoliciesPage = permissions.canReadPolicies || permissions.canManageRoles;
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles(canAccessPoliciesPage);
  const { data: policies = [], isLoading: isLoadingPolicies } = usePolicies(canAccessPoliciesPage);

  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [isCreatePolicyDialogOpen, setIsCreatePolicyDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [previewPolicy, setPreviewPolicy] = useState<Policy | null>(null);
  const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);

  const [policyName, setPolicyName] = useState("");
  const [policyDescription, setPolicyDescription] = useState("");
  const [policyJson, setPolicyJson] = useState(EMPTY_POLICY_JSON);

  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  const availablePolicies = useMemo(
    () =>
      policies.map((policy) => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
      })),
    [policies],
  );

  const resetPolicyForm = () => {
    setPolicyName("");
    setPolicyDescription("");
    setPolicyJson(EMPTY_POLICY_JSON);
    setEditingPolicy(null);
  };

  const resetRoleForm = () => {
    setRoleName("");
    setRoleDescription("");
    setSelectedPolicies([]);
    setEditingRole(null);
  };

  const parsePolicyStatements = (): PolicyStatement[] | null => {
    try {
      return JSON.parse(policyJson) as PolicyStatement[];
    } catch {
      toast.error("Policy JSON is invalid.");
      return null;
    }
  };

  const handleCreatePolicy = (event: React.FormEvent) => {
    event.preventDefault();
    const statements = parsePolicyStatements();
    if (!statements) {
      return;
    }

    createPolicy.mutate(
      {
        name: policyName,
        description: policyDescription || undefined,
        statements,
      },
      {
        onSuccess: () => {
          setIsCreatePolicyDialogOpen(false);
          resetPolicyForm();
        },
      },
    );
  };

  const handleUpdatePolicy = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPolicy) {
      return;
    }

    const statements = parsePolicyStatements();
    if (!statements) {
      return;
    }

    updatePolicy.mutate(
      {
        policyId: editingPolicy.id,
        data: {
          name: policyName,
          description: policyDescription || undefined,
          statements,
        },
      },
      {
        onSuccess: () => {
          resetPolicyForm();
        },
      },
    );
  };

  const handleCreateRole = (event: React.FormEvent) => {
    event.preventDefault();
    createRole.mutate(
      {
        name: roleName,
        description: roleDescription || undefined,
        policyIds: selectedPolicies,
      },
      {
        onSuccess: () => {
          setIsRoleDialogOpen(false);
          resetRoleForm();
        },
      },
    );
  };

  const handleUpdateRole = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRole) {
      return;
    }

    updateRole.mutate(
      {
        roleId: editingRole.id,
        data: {
          name: roleName,
          description: roleDescription || undefined,
          policyIds: selectedPolicies,
        },
      },
      {
        onSuccess: () => {
          resetRoleForm();
        },
      },
    );
  };

  const openEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setPolicyName(policy.name);
    setPolicyDescription(policy.description || "");
    setPolicyJson(JSON.stringify(policy.document?.statements || [], null, 2));
  };

  const openEditRole = (role: OrganizationRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPolicies(role.policyAttachments.map((attachment) => attachment.policy.id));
  };

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="app-empty">
          <Building2 className="mx-auto mb-4 h-10 w-10" />
          <p className="text-lg font-bold tracking-tight text-foreground">
            Select an organization to view policies
          </p>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-7 text-muted-foreground">
            Policies and roles are organization-scoped.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!canAccessPoliciesPage) {
    return (
      <DashboardLayout>
        <div className="app-empty">
          <Shield className="mx-auto mb-4 h-10 w-10" />
          <p className="text-lg font-bold tracking-tight text-foreground">
            Policy access is restricted
          </p>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-7 text-muted-foreground">
            Policy documents and custom role design are limited to organization owners.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const managedPolicyCount = policies.filter((policy) => policy.isManaged).length;
  const managedRoleCount = roles.filter((role) => role.isDefault).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[60ch]">
            <p className="app-eyebrow">Policies</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Access policies
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Review coverage in a list, then open a focused modal to inspect or edit grants.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              {currentOrganization.name}
            </Badge>
            <Badge variant="outline">{managedPolicyCount} managed</Badge>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Roles" value={roles.length} detail="Managed and custom." />
          <MetricCard label="Policies" value={policies.length} detail="All policy rules." />
          <MetricCard label="Baseline" value={managedRoleCount} detail="Managed defaults." />
        </section>

        <Card>
          <CardHeader className="border-b border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">Roles</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Assigned to members and teams.</p>
              </div>
              {permissions.canManageRoles ? (
                <Dialog
                  open={isRoleDialogOpen}
                  onOpenChange={(open) => {
                    setIsRoleDialogOpen(open);
                    if (!open) {
                      resetRoleForm();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="h-11 px-5">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[560px]">
                    <form onSubmit={handleCreateRole} className="space-y-5">
                      <DialogHeader>
                        <DialogTitle>Create custom role</DialogTitle>
                        <DialogDescription>
                          Name the role and attach the policies it should aggregate.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="roleName">Role name</Label>
                        <Input
                          id="roleName"
                          value={roleName}
                          onChange={(event) => setRoleName(event.target.value)}
                          placeholder="SRE Root"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roleDescription">Description</Label>
                        <Input
                          id="roleDescription"
                          value={roleDescription}
                          onChange={(event) => setRoleDescription(event.target.value)}
                          placeholder="Broad infrastructure and reveal access"
                        />
                      </div>
                      <PolicySelection
                        policies={availablePolicies}
                        selectedPolicies={selectedPolicies}
                        onToggle={(policyId, checked) =>
                          setSelectedPolicies((current) =>
                            checked ? [...current, policyId] : current.filter((id) => id !== policyId),
                          )
                        }
                      />
                      <Button type="submit" className="h-11 w-full" disabled={createRole.isPending}>
                        Create Role
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingRoles ? (
              <div className="p-6 text-sm text-muted-foreground">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="No roles yet"
                  body="Create a role when you need a reusable access bundle beyond the default baselines."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="grid gap-4 px-6 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] lg:items-start"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{role.name}</p>
                        {role.isDefault ? <Badge variant="secondary">Managed</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {role.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {role.policyAttachments.length > 0 ? (
                        <CompactBadgeList
                          items={role.policyAttachments.map((attachment) => attachment.policy.name)}
                          icon="shield"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">No attached policies.</span>
                      )}
                    </div>

                    <div className="flex justify-start lg:justify-end">
                      {!role.isDefault && permissions.canManageRoles ? (
                        <Button variant="outline" size="sm" onClick={() => openEditRole(role)}>
                          Edit
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">System role</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">Policies</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compact rows in the page, full grant matrix in the modal.
                </p>
              </div>
              {permissions.canCreatePolicies ? (
                <Dialog
                  open={isCreatePolicyDialogOpen}
                  onOpenChange={(open) => {
                    setIsCreatePolicyDialogOpen(open);
                    if (!open) {
                      resetPolicyForm();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-11 px-5">
                      <FileCode2 className="mr-2 h-4 w-4" />
                      New Policy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[860px] overflow-hidden p-0">
                    <form onSubmit={handleCreatePolicy} className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden">
                      <div className="space-y-5 border-b border-border px-6 pb-5 pt-6">
                        <DialogHeader>
                          <DialogTitle>Create policy</DialogTitle>
                          <DialogDescription>
                            Use the default builder for straightforward grants or switch to raw JSON when needed.
                          </DialogDescription>
                        </DialogHeader>
                        <PolicyMetadataFields
                          name={policyName}
                          description={policyDescription}
                          onNameChange={setPolicyName}
                          onDescriptionChange={setPolicyDescription}
                        />
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
                        <PolicyEditor value={policyJson} onChange={setPolicyJson} />
                      </div>
                      <div className="border-t border-border px-6 py-4">
                        <Button type="submit" className="h-11 w-full" disabled={createPolicy.isPending}>
                          Save Policy
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingPolicies ? (
              <div className="p-6 text-sm text-muted-foreground">Loading policies...</div>
            ) : policies.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<LockKeyhole className="h-5 w-5" />}
                  title="No policies yet"
                  body="Create a policy to define exactly which grants a custom role should carry."
                />
              </div>
            ) : (
              <>
                <div className="divide-y divide-border lg:hidden">
                  {policies.map((policy) => {
                    const summary = summarizePolicy(policy);

                    return (
                      <article key={policy.id} className="space-y-4 px-6 py-5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">{policy.name}</p>
                            <Badge variant={policy.isManaged ? "secondary" : "outline"}>
                              {policy.isManaged ? "Managed" : "Custom"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {policy.description || "No description provided."}
                          </p>
                        </div>

                        <dl className="grid gap-4 text-sm sm:grid-cols-3">
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Coverage
                            </dt>
                            <dd className="mt-2 space-y-1 text-muted-foreground">
                              <p>{summary.statementCount} rules</p>
                              <p>{summary.actionCount} grants</p>
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Grants
                            </dt>
                            <dd className="mt-2 flex flex-wrap gap-2">
                              {summary.preview.length > 0 ? (
                                <CompactBadgeList items={summary.preview} />
                              ) : (
                                <span className="text-sm text-muted-foreground">No grants defined.</span>
                              )}
                            </dd>
                          </div>
                        </dl>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPreviewPolicy(policy)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                          {!policy.isManaged && permissions.canEditPolicies ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openEditPolicy(policy)}>
                                <PencilLine className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                                {permissions.canDeletePolicies ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                    aria-label={`Delete ${policy.name}`}
                                    onClick={() => {
                                      if (window.confirm(`Delete policy "${policy.name}"?`)) {
                                        deletePolicy.mutate(policy.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </>
                            ) : (
                            <span className="text-sm text-muted-foreground">System policy</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full border-collapse">
                    <caption className="sr-only">Organization policies and grants</caption>
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        <th scope="col" className="px-6 py-3">Policy</th>
                        <th scope="col" className="px-6 py-3">Coverage</th>
                        <th scope="col" className="px-6 py-3">Grants</th>
                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {policies.map((policy) => {
                        const summary = summarizePolicy(policy);

                        return (
                          <tr key={policy.id} className="align-top">
                            <th scope="row" className="px-6 py-5 text-left font-normal">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-foreground">{policy.name}</p>
                                  <Badge variant={policy.isManaged ? "secondary" : "outline"}>
                                    {policy.isManaged ? "Managed" : "Custom"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {policy.description || "No description provided."}
                                </p>
                              </div>
                            </th>
                            <td className="px-6 py-5 text-sm text-muted-foreground">
                              <div className="space-y-1">
                                <p>{summary.statementCount} rules</p>
                                <p>{summary.actionCount} grants</p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="max-w-full">
                                {summary.preview.length > 0 ? (
                                  <CompactBadgeList items={summary.preview} />
                                ) : (
                                  <span className="text-sm text-muted-foreground">No grants defined.</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPreviewPolicy(policy)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                                {!policy.isManaged && permissions.canEditPolicies ? (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openEditPolicy(policy)}>
                                      <PencilLine className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                    {permissions.canDeletePolicies ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                        aria-label={`Delete ${policy.name}`}
                                        onClick={() => {
                                          if (window.confirm(`Delete policy "${policy.name}"?`)) {
                                            deletePolicy.mutate(policy.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">System policy</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={permissions.canManageRoles && !!editingRole}
          onOpenChange={(open) => {
            if (!open) {
              resetRoleForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-[560px]">
            <form onSubmit={handleUpdateRole} className="space-y-5">
              <DialogHeader>
                <DialogTitle>Edit role</DialogTitle>
                <DialogDescription>Adjust the role details and attached policies.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="editRoleName">Role name</Label>
                <Input
                  id="editRoleName"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRoleDescription">Description</Label>
                <Input
                  id="editRoleDescription"
                  value={roleDescription}
                  onChange={(event) => setRoleDescription(event.target.value)}
                />
              </div>
              <PolicySelection
                policies={availablePolicies}
                selectedPolicies={selectedPolicies}
                onToggle={(policyId, checked) =>
                  setSelectedPolicies((current) =>
                    checked ? [...current, policyId] : current.filter((id) => id !== policyId),
                  )
                }
              />
              <Button type="submit" className="h-11 w-full" disabled={updateRole.isPending}>
                Save Role
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={permissions.canEditPolicies && !!editingPolicy}
          onOpenChange={(open) => {
            if (!open) {
              resetPolicyForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-[860px] overflow-hidden p-0">
            <form onSubmit={handleUpdatePolicy} className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden">
              <div className="space-y-5 border-b border-border px-6 pb-5 pt-6">
                <DialogHeader>
                  <DialogTitle>Edit policy</DialogTitle>
                  <DialogDescription>
                    Keep the page compact. Review and edit grants here.
                  </DialogDescription>
                </DialogHeader>
                <PolicyMetadataFields
                  name={policyName}
                  description={policyDescription}
                  onNameChange={setPolicyName}
                  onDescriptionChange={setPolicyDescription}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
                <PolicyEditor value={policyJson} onChange={setPolicyJson} />
              </div>
              <div className="border-t border-border px-6 py-4">
                <Button type="submit" className="h-11 w-full" disabled={updatePolicy.isPending}>
                  Save Policy
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewPolicy} onOpenChange={(open) => !open && setPreviewPolicy(null)}>
          <DialogContent className="sm:max-w-[860px] overflow-hidden p-0">
            {previewPolicy ? (
              <div className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden">
                <div className="space-y-5 border-b border-border px-6 pb-5 pt-6">
                  <DialogHeader>
                    <DialogTitle>{previewPolicy.name}</DialogTitle>
                    <DialogDescription>
                      {previewPolicy.description || "Review grants in the default builder or inspect raw JSON."}
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
                  <PolicyEditor
                    value={JSON.stringify(previewPolicy.document?.statements || [], null, 2)}
                    readOnly
                  />
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-[18px] border border-border bg-card px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </article>
  );
}

function CompactBadgeList({
  items,
  limit = 3,
  icon,
}: {
  items: string[];
  limit?: number;
  icon?: "shield";
}) {
  const visibleItems = items.slice(0, limit);
  const hiddenItems = items.slice(limit);

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {visibleItems.map((item) => (
        <Badge key={item} variant="outline" className="max-w-full">
          {icon === "shield" ? <Shield className="mr-1.5 h-3 w-3 shrink-0" /> : null}
          <span className="truncate">{item}</span>
        </Badge>
      ))}
      {hiddenItems.length > 0 ? (
        <Badge
          variant="outline"
          className="border-dashed text-muted-foreground"
          title={hiddenItems.join(", ")}
        >
          +{hiddenItems.length} more
        </Badge>
      ) : null}
    </div>
  );
}

function PolicyMetadataFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="policyName">Policy name</Label>
        <Input
          id="policyName"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Reveal Operators"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="policyDescription">Description</Label>
        <Input
          id="policyDescription"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Optional context for operators"
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="app-empty">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-muted text-foreground">
        {icon}
      </div>
      <p className="mt-4 text-base font-semibold tracking-tight text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-6 text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function PolicySelection({
  policies,
  selectedPolicies,
  onToggle,
}: {
  policies: Array<{ id: string; name: string; description?: string }>;
  selectedPolicies: string[];
  onToggle: (policyId: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Attach policies</Label>
      <div className="grid max-h-56 gap-2 overflow-y-auto border border-border p-3">
        {policies.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No policies available yet.</p>
        ) : (
          policies.map((policy) => {
            const checked = selectedPolicies.includes(policy.id);

            return (
              <label key={policy.id} className="flex items-start gap-3 border-b border-border px-3 py-3 last:border-b-0">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => onToggle(policy.id, nextChecked === true)}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">{policy.name}</span>
                  <span className="block text-sm leading-6 text-muted-foreground">
                    {policy.description || "No description provided."}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
