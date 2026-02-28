"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useInviteUser,
  useRemoveMember,
  useUpdateMemberRole,
  useTeams,
  useCreateTeam,
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from "@/hooks/use-organizations";
import { useOrganizationStore } from "@/store/organization.store";
import { useRBAC } from "@/hooks/use-rbac";
import { useRoles } from "@/hooks/use-policies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Users,
  Trash2,
  Mail,
  Shield,
  Edit,
  Loader2,
  UserPlus,
  Layers,
  CheckCircle2,
} from "lucide-react";

const roleOptions = ["MEMBER", "ADMIN", "OWNER"] as const;

type Role = (typeof roleOptions)[number];

function displayName(member: {
  user: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}) {
  if (member.user.firstName || member.user.lastName) {
    return `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim();
  }
  return member.user.username || member.user.email;
}

export default function OrganizationsPage() {
  const permissions = useRBAC();
  const { currentOrganization, setCurrentOrganization } = useOrganizationStore();
  const { data: organizations, isLoading } = useOrganizations();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);

  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [editingOrg, setEditingOrg] = useState<{
    id: string;
    name: string;
    description?: string;
  } | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedTeamIdForMemberAdd, setSelectedTeamIdForMemberAdd] = useState<string>("");
  const [selectedUserIdForTeamAdd, setSelectedUserIdForTeamAdd] = useState<string>("");

  const selectedOrg = useMemo(
    () => organizations?.find((org) => org.id === (selectedOrgId || currentOrganization?.id)),
    [organizations, selectedOrgId, currentOrganization?.id],
  );
  const { data: teams } = useTeams(selectedOrg?.id || currentOrganization?.id);
  const { data: orgRoles } = useRoles();

  const { mutate: createOrg, isPending: isCreating } = useCreateOrganization();
  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrganization();
  const { mutate: deleteOrg, isPending: isDeleting } = useDeleteOrganization();
  const { mutate: inviteUser, isPending: isInviting } = useInviteUser();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateMemberRole();
  const { mutate: createTeam, isPending: isCreatingTeam } = useCreateTeam();
  const { mutate: deleteTeam, isPending: isDeletingTeam } = useDeleteTeam();
  const { mutate: addTeamMember, isPending: isAddingTeamMember } = useAddTeamMember();
  const { mutate: removeTeamMember, isPending: isRemovingTeamMember } = useRemoveTeamMember();

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    createOrg(
      { name: newOrgName, description: newOrgDescription || undefined },
      {
        onSuccess: (data) => {
          setShowCreateForm(false);
          setNewOrgName("");
          setNewOrgDescription("");
          setCurrentOrganization(data);
          setSelectedOrgId(data.id);
        },
      },
    );
  };

  const handleUpdateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    updateOrg(
      {
        id: editingOrg.id,
        data: {
          name: editingOrg.name,
          description: editingOrg.description || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingOrg(null);
        },
      },
    );
  };

  const handleDeleteOrg = (id: string) => {
    if (!confirm("Delete this organization permanently?")) return;

    deleteOrg(id, {
      onSuccess: () => {
        if (currentOrganization?.id === id) {
          setCurrentOrganization(null);
        }
        setSelectedOrgId(null);
      },
    });
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    inviteUser(
      {
        organizationId: selectedOrg.id,
        data: { email: inviteEmail, roleId: inviteRoleId || undefined },
      },
      {
        onSuccess: (data: any) => {
          setInviteEmail("");
          setInviteRoleId("");
          setShowInviteForm(false);
          
          if (data?.invitation?.token) {
            const inviteLink = `${window.location.origin}/invite?token=${data.invitation.token}`;
            toast.success("User invited successfully!", {
              description: "Share this link: " + inviteLink,
              duration: 10000,
              action: {
                label: "Copy Link",
                onClick: () => navigator.clipboard.writeText(inviteLink),
              },
            });
          } else {
            toast.success("User added to organization successfully");
          }
        },
      },
    );
  };

  const handleUpdateRole = (userId: string, roleId: string) => {
    if (!selectedOrg) return;
    updateRole({
      organizationId: selectedOrg.id,
      userId,
      data: { roleId },
    });
  };

  const handleRemoveMember = (userId: string) => {
    if (!selectedOrg) return;
    if (!confirm("Remove this member from the organization?")) return;
    removeMember({ organizationId: selectedOrg.id, userId });
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !newTeamName.trim()) return;

    createTeam(
      {
        organizationId: selectedOrg.id,
        data: {
          name: newTeamName.trim(),
          description: newTeamDescription || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowTeamForm(false);
          setNewTeamName("");
          setNewTeamDescription("");
        },
      },
    );
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!selectedOrg) return;
    if (!confirm("Delete this team?")) return;
    deleteTeam({ organizationId: selectedOrg.id, teamId });
  };

  const handleAddTeamMember = (teamId: string) => {
    if (!selectedOrg || !selectedUserIdForTeamAdd) return;

    addTeamMember({
      organizationId: selectedOrg.id,
      teamId,
      userId: selectedUserIdForTeamAdd,
    });

    setSelectedTeamIdForMemberAdd("");
    setSelectedUserIdForTeamAdd("");
  };

  const handleRemoveTeamMember = (teamId: string, userId: string) => {
    if (!selectedOrg) return;
    removeTeamMember({ organizationId: selectedOrg.id, teamId, userId });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-80 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="kms-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="kms-title">Teams & Organizations</h1>
              <p className="kms-subtitle mt-2">
                Manage tenant boundaries, member roles, and team assignments for access control.
              </p>
            </div>
            <Button
              className="rounded-xl"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateOrg} className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="new-org-name">Name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Acme Security"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="new-org-description">Description</Label>
                <Input
                  id="new-org-description"
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="Production KMS tenant"
                />
              </div>
              <div className="flex items-end gap-2 md:col-span-1">
                <Button type="submit" disabled={isCreating || !newOrgName}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName("");
                    setNewOrgDescription("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {organizations?.map((org) => {
            const isActive = selectedOrg?.id === org.id || currentOrganization?.id === org.id;
            return (
              <button
                key={org.id}
                className={`kms-kpi text-left ${isActive ? "ring-2 ring-primary/65" : ""}`}
                onClick={() => {
                  setSelectedOrgId(org.id);
                  setCurrentOrganization(org);
                }}
                type="button"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/12 p-2 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium tracking-tight">{org.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{org.description || "No description"}</p>
                    </div>
                  </div>
                  <Badge variant={org.userRole === "OWNER" ? "default" : "secondary"}>{org.userRole}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{org._count?.members || 0} members</span>
                  <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" />{org._count?.vaults || 0} vaults</span>
                </div>
              </button>
            );
          })}
        </section>

        {selectedOrg ? (
          <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
            <Card className="kms-surface border-border/80">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    {editingOrg?.id === selectedOrg.id ? (
                      <form onSubmit={handleUpdateOrg} className="space-y-2">
                        <Input
                          value={editingOrg.name}
                          onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                        />
                        <Input
                          value={editingOrg.description || ""}
                          onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingOrg(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <CardTitle className="text-xl tracking-tight">{selectedOrg.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedOrg.description || "No description"}</p>
                      </>
                    )}
                  </div>

                  {editingOrg?.id !== selectedOrg.id ? (
                    <div className="flex gap-2">
                      {permissions.canEditOrganization ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setEditingOrg({
                              id: selectedOrg.id,
                              name: selectedOrg.name,
                              description: selectedOrg.description,
                            })
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {permissions.canDeleteOrganization ? (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteOrg(selectedOrg.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Organization Members</p>
                  {permissions.canInviteUsers ? (
                    <Button size="sm" variant="outline" onClick={() => setShowInviteForm((v) => !v)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                  ) : null}
                </div>

                {showInviteForm ? (
                  <form onSubmit={handleInviteUser} className="grid gap-3 rounded-xl border border-border/70 bg-background/60 p-3 md:grid-cols-3">
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@company.com"
                      required
                    />
                    <select
                      value={inviteRoleId}
                      onChange={(e) => setInviteRoleId(e.target.value)}
                      className="flex h-10 rounded-xl border border-border bg-card px-3 text-sm"
                    >
                      <option value="">Default Member</option>
                      {orgRoles?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isInviting}>
                        {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteEmail("");
                          setInviteRoleId("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}

                <div className="space-y-2">
                  {selectedOrg.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{displayName(member)}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {permissions.canManageRoles ? (
                          <select
                            value={member.roleId || ""}
                            onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                            disabled={isUpdatingRole}
                            className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
                          >
                            <option value="">Default Member</option>
                            {orgRoles?.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="secondary">{member.role?.name || "Member"}</Badge>
                        )}
                        {permissions.canRemoveMembers ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="kms-surface border-border/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl tracking-tight">Teams</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Assign organization members to policy-ready team scopes.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowTeamForm((v) => !v)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Team
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {showTeamForm ? (
                  <form onSubmit={handleCreateTeam} className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">Team name</Label>
                      <Input
                        id="team-name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Platform"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-description">Description</Label>
                      <Input
                        id="team-description"
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        placeholder="Handles infra and runtime secrets"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isCreatingTeam || !newTeamName.trim()}>
                        {isCreatingTeam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowTeamForm(false);
                          setNewTeamName("");
                          setNewTeamDescription("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}

                {teams?.map((team) => (
                  <div key={team.id} className="rounded-xl border border-border/70 bg-background/55 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium tracking-tight">{team.name}</p>
                        <p className="text-xs text-muted-foreground">{team.description || "No description"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{team._count?.members || 0} members</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteTeam(team.id)} disabled={isDeletingTeam}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {team.members?.map((membership) => (
                        <div key={membership.id} className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-2 py-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          <span>{membership.user.email}</span>
                          <button
                            type="button"
                            className="text-destructive"
                            onClick={() => handleRemoveTeamMember(team.id, membership.userId)}
                            disabled={isRemovingTeamMember}
                            aria-label="Remove team member"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={selectedTeamIdForMemberAdd === team.id ? selectedUserIdForTeamAdd : ""}
                        onChange={(e) => {
                          setSelectedTeamIdForMemberAdd(team.id);
                          setSelectedUserIdForTeamAdd(e.target.value);
                        }}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-sm"
                      >
                        <option value="">Add member...</option>
                        {selectedOrg.members
                          ?.filter((m) => !(team.members || []).some((tm) => tm.userId === m.userId))
                          .map((m) => (
                            <option key={m.id} value={m.userId}>
                              {m.user.email}
                            </option>
                          ))}
                      </select>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleAddTeamMember(team.id)}
                        disabled={
                          isAddingTeamMember ||
                          selectedTeamIdForMemberAdd !== team.id ||
                          !selectedUserIdForTeamAdd
                        }
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {!teams?.length ? (
                  <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
                    <Layers className="mx-auto mb-2 h-5 w-5" />
                    No teams yet. Create one to assign scoped permissions.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border/80 px-6 py-14 text-center text-muted-foreground">
            Select an organization to manage members and teams.
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
