"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useInviteUser,
  useOrganizationInvitations,
  useRevokeInvitation,
  useRemoveMember,
  useUpdateMemberRole,
  useTeams,
  useCreateTeam,
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  useAssignTeamRole,
  useRemoveTeamRole,
} from "@/hooks/use-organizations";
import type { InviteUserResponse, OrganizationInvitation } from "@/services/organization.service";
import { useOrganizationStore } from "@/store/organization.store";
import { useRBAC } from "@/hooks/use-rbac";
import { useRoles } from "@/hooks/use-policies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Users,
  Trash2,
  Shield,
  Edit,
  Loader2,
  UserPlus,
  Layers,
  Copy,
  X,
  ChevronRight,
} from "lucide-react";

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

const DEFAULT_ROLE_VALUE = "__member__";

const invitationDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatInvitationDate(value: string) {
  return invitationDateFormatter.format(new Date(value));
}

function displayInviter(invitation: OrganizationInvitation) {
  const inviter = invitation.invitedBy;
  if (inviter.firstName || inviter.lastName) {
    return `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim();
  }
  return inviter.username || inviter.email;
}

export default function OrganizationsPage() {
  const permissions = useRBAC();
  const { currentOrganization, setCurrentOrganization } = useOrganizationStore();
  const { data: organizations, isLoading } = useOrganizations();
  const shouldLoadRoles =
    permissions.canCreateInvitations ||
    permissions.canChangeRoles ||
    permissions.canReadRoles ||
    permissions.canAssignTeamRoles;

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [accessTeamId, setAccessTeamId] = useState<string | null>(null);
  const [pendingTeamRoleId, setPendingTeamRoleId] = useState<string>("");

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
  const { data: pendingInvitations } = useOrganizationInvitations(
    selectedOrg?.id || currentOrganization?.id,
    permissions.canReadInvitations,
  );
  const { data: orgRoles } = useRoles(shouldLoadRoles);

  const { mutate: createOrg, isPending: isCreating } = useCreateOrganization();
  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrganization();
  const { mutate: deleteOrg, isPending: isDeleting } = useDeleteOrganization();
  const { mutate: inviteUser, isPending: isInviting } = useInviteUser();
  const { mutate: revokeInvitation, isPending: isRevokingInvitation } = useRevokeInvitation();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateMemberRole();
  const { mutate: createTeam, isPending: isCreatingTeam } = useCreateTeam();
  const { mutate: deleteTeam, isPending: isDeletingTeam } = useDeleteTeam();
  const { mutate: addTeamMember, isPending: isAddingTeamMember } = useAddTeamMember();
  const { mutate: removeTeamMember, isPending: isRemovingTeamMember } = useRemoveTeamMember();
  const { mutate: assignTeamRole, isPending: isAssigningTeamRole } = useAssignTeamRole();
  const { mutate: removeTeamRole, isPending: isRemovingTeamRole } = useRemoveTeamRole();

  const roleItems = orgRoles?.map((role) => ({
    value: role.id,
    label: role.name,
    description: role.description || undefined,
  })) || [];
  const accessTeam = teams?.find((team) => team.id === accessTeamId) || null;
  const assignableRoleItems = roleItems.filter(
    (role) => !accessTeam?.roleAssignments?.some((assignment) => assignment.roleId === role.value),
  );

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
        onSuccess: (data: InviteUserResponse) => {
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

  const copyInviteLink = async (invitation: OrganizationInvitation) => {
    const inviteLink = `${window.location.origin}/invite?token=${invitation.token}`;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  };

  const handleRevokeInvitation = (invitationId: string) => {
    if (!selectedOrg) return;
    if (!confirm("Revoke this invitation?")) return;
    revokeInvitation({ organizationId: selectedOrg.id, invitationId });
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

  const handleAssignTeamRole = () => {
    if (!selectedOrg || !accessTeamId || !pendingTeamRoleId) return;
    assignTeamRole(
      {
        organizationId: selectedOrg.id,
        teamId: accessTeamId,
        data: { roleId: pendingTeamRoleId },
      },
      {
        onSuccess: () => {
          setPendingTeamRoleId("");
        },
      },
    );
  };

  const handleRemoveTeamRole = (teamId: string, roleId: string) => {
    if (!selectedOrg) return;
    removeTeamRole({ organizationId: selectedOrg.id, teamId, roleId });
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

  const teamAccessLabel = permissions.canAssignTeamRoles ? "Manage Access" : "View Access";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="app-page-header">
          <div className="app-page-intro">
            <p className="app-eyebrow">Organizations</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Organizations
            </h1>
            <p className="app-page-copy">
              Members, roles, and teams.
            </p>
          </div>
          <Button onClick={() => setShowCreateForm((v) => !v)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New organization
          </Button>
        </section>

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="border-b border-border/80 px-6 py-5 sm:px-7">
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                Set up a new workspace boundary for members, vaults, and policies.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrg} className="app-dialog-body grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Acme Security"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-org-description">Description</Label>
                <Input
                  id="new-org-description"
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="Production KMS tenant"
                />
              </div>
              <DialogFooter className="app-dialog-footer md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName("");
                    setNewOrgDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newOrgName}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {organizations?.map((org) => {
            const isActive = selectedOrg?.id === org.id || currentOrganization?.id === org.id;
            return (
              <button
                key={org.id}
                className={cn(
                  "rounded-[18px] border border-border bg-card p-5 text-left transition-colors",
                  isActive ? "border-foreground" : "hover:bg-muted/30"
                )}
                onClick={() => {
                  setSelectedOrgId(org.id);
                  setCurrentOrganization(org);
                }}
                type="button"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground",
                      isActive ? "bg-foreground text-background" : ""
                    )}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold tracking-tight leading-tight mb-1">{org.name}</p>
                      <p className="text-[13px] text-muted-foreground line-clamp-1">{org.description || "No description provided"}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-4 text-[13px] font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-foreground/40" />{org._count?.members || 0}</span>
                    <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4 text-foreground/40" />{org._count?.vaults || 0}</span>
                  </div>
                  <Badge variant={org.userRole === "OWNER" ? "default" : "secondary"}>{org.userRole}</Badge>
                </div>
              </button>
            );
          })}
        </section>

        {selectedOrg ? (
          <section className="grid gap-8 xl:grid-cols-[1.1fr_1fr]">
            <Card className="flex flex-col">
              <CardHeader className="border-b border-border p-6 lg:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 w-full">
                    {editingOrg?.id === selectedOrg.id ? (
                      <form onSubmit={handleUpdateOrg} className="space-y-3">
                        <Input
                          value={editingOrg.name}
                          onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                          className="h-11 text-lg font-semibold"
                        />
                        <Input
                          value={editingOrg.description || ""}
                          onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                          placeholder="Description"
                          className="h-11"
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingOrg(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <CardTitle className="text-2xl font-semibold tracking-tight">{selectedOrg.name}</CardTitle>
                        <p className="text-[15px] text-muted-foreground">{selectedOrg.description || "No description provided"}</p>
                      </>
                    )}
                  </div>

                  {editingOrg?.id !== selectedOrg.id && (
                    <div className="flex gap-2 shrink-0">
                      {permissions.canEditOrganization && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-10 w-10 shadow-none border-transparent"
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
                      )}
                      {permissions.canDeleteOrganization && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-10 w-10 shadow-none border-transparent"
                          onClick={() => handleDeleteOrg(selectedOrg.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 lg:p-8 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold tracking-tight">Members</h3>
                  {permissions.canCreateInvitations && (
                    <Button size="sm" onClick={() => setShowInviteForm((v) => !v)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </Button>
                  )}
                </div>

                {permissions.canCreateInvitations && showInviteForm && (
                  <form onSubmit={handleInviteUser} className="mb-6 grid gap-4 border-b border-border pb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="h-11 flex-1"
                        required
                      />
                      <Select
                        value={inviteRoleId || DEFAULT_ROLE_VALUE}
                        onValueChange={(value) => setInviteRoleId(value === DEFAULT_ROLE_VALUE ? "" : value)}
                      >
                        <SelectTrigger className="w-full sm:w-56">
                          <SelectValue placeholder="Member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_ROLE_VALUE}>Member</SelectItem>
                          {roleItems.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" size="sm" disabled={isInviting || !inviteEmail}>
                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invite
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
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
                )}

                {permissions.canReadInvitations && (
                  <div className="mb-6 border-b border-border pb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Pending invites</h4>
                      <span className="text-sm text-muted-foreground">
                        {pendingInvitations?.length || 0}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {pendingInvitations?.slice(0, 6).map((invitation) => (
                        <div key={invitation.id} className="flex items-start justify-between gap-4 border border-border px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{invitation.email}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {invitation.roleName || "Member"} • {displayInviter(invitation)} • expires {formatInvitationDate(invitation.expiresAt)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => copyInviteLink(invitation)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {permissions.canRevokeInvitations && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRevokeInvitation(invitation.id)}
                                disabled={isRevokingInvitation}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      {pendingInvitations?.length === 0 && (
                        <div className="border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                          No pending invitations.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedOrg.members?.map((member) => (
                    <div key={member.id} className="group flex items-center justify-between border-b border-border py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                          {displayName(member).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold tracking-tight text-foreground">{displayName(member)}</p>
                          <p className="text-[13px] text-muted-foreground mt-0.5">{member.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {permissions.canChangeRoles ? (
                          <Select
                            value={member.roleId || DEFAULT_ROLE_VALUE}
                            onValueChange={(value) => handleUpdateRole(member.userId, value === DEFAULT_ROLE_VALUE ? "" : value)}
                            disabled={isUpdatingRole}
                          >
                            <SelectTrigger className="h-9 min-w-[140px]">
                              <SelectValue placeholder="Member" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={DEFAULT_ROLE_VALUE}>Member</SelectItem>
                              {roleItems.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{member.role?.name || "Member"}</Badge>
                        )}

                        {permissions.canRemoveMembers && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!selectedOrg.members || selectedOrg.members.length === 0) && (
                    <div className="app-empty">
                      <Users className="h-8 w-8 text-muted-foreground/50 mb-3" />
                      <p className="text-[15px] font-semibold text-foreground">No members yet</p>
                      <p className="text-[13px] text-muted-foreground mt-1">Invite people to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="border-b border-border p-6 lg:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-semibold tracking-tight">Teams</CardTitle>
                    <p className="text-[15px] text-muted-foreground mt-1.5">Access groups and policies.</p>
                  </div>
                  {permissions.canManageTeams ? (
                    <Button size="icon" variant="secondary" className="h-10 w-10 shadow-none border-transparent" onClick={() => setShowTeamForm((v) => !v)}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="p-6 lg:p-8 flex-1 space-y-6">
                <div className="space-y-4">
                  {teams?.map((team) => (
                    <div key={team.id} className="border-b border-border pb-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[16px] font-semibold tracking-tight text-foreground">{team.name}</p>
                          <p className="text-[13px] text-muted-foreground mt-1">{team.description || "No description provided"}</p>
                        </div>
                        {permissions.canManageTeams ? (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTeam(team.id)} disabled={isDeletingTeam}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {team.members?.map((membership) => (
                          <div key={membership.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground">
                            <span>{membership.user.email}</span>
                            {permissions.canManageTeams ? (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full p-1 transition-colors"
                                onClick={() => handleRemoveTeamMember(team.id, membership.userId)}
                                disabled={isRemovingTeamMember}
                                aria-label="Remove team member"
                              >
                                <Plus className="h-3 w-3 rotate-45" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {permissions.canReadRoles ? (
                        <div className="mt-5 rounded-[16px] border border-border bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Team access</p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Team roles add inherited access. They do not replace a member&apos;s organization role.
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 shrink-0 px-2 text-xs"
                              onClick={() => {
                                setAccessTeamId(team.id);
                                setPendingTeamRoleId("");
                              }}
                            >
                              {teamAccessLabel}
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {team.roleAssignments?.length ? (
                              team.roleAssignments.map((assignment) => (
                                <Badge key={assignment.id} variant="secondary" className="font-medium">
                                  {assignment.role.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No inherited roles.</span>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {permissions.canManageTeams ? (
                        <div className="mt-5 flex items-center gap-2">
                          <Combobox
                            items={
                              selectedOrg.members
                                ?.filter((m) => !(team.members || []).some((tm) => tm.userId === m.userId))
                                .map((m) => ({
                                  value: m.userId,
                                  label: displayName(m),
                                  description: m.user.email,
                                  keywords: [m.user.email, m.user.username || ""],
                                })) || []
                            }
                            value={selectedTeamIdForMemberAdd === team.id ? selectedUserIdForTeamAdd : ""}
                            placeholder="Add member..."
                            searchPlaceholder="Search members..."
                            emptyText="No available members."
                            onValueChange={(value) => {
                              setSelectedTeamIdForMemberAdd(team.id);
                              setSelectedUserIdForTeamAdd(value);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-10 w-10"
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
                      ) : null}
                    </div>
                  ))}

                  {(!teams || teams.length === 0) && (
                    <div className="app-empty">
                      <Layers className="h-10 w-10 text-muted-foreground/40 mb-4" />
                      <p className="text-[15px] font-semibold text-foreground">No Teams Built</p>
                      <p className="text-[13px] text-muted-foreground mt-1 max-w-[200px]">Create a team to group permissions.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="app-empty min-h-[400px] flex items-start justify-center flex-col">
            <h2 className="text-xl font-bold tracking-tight text-foreground">No Organization Selected</h2>
            <p className="text-[15px] text-muted-foreground mt-2">Select an organization above.</p>
          </section>
        )}

        <Dialog
          open={permissions.canManageTeams && showTeamForm}
          onOpenChange={setShowTeamForm}
        >
          <DialogContent className="max-w-xl p-0">
            <DialogHeader className="border-b border-border/80 px-6 py-5 sm:px-7">
              <DialogTitle>Create team</DialogTitle>
              <DialogDescription>
                Group members and attach inherited access in one place.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="app-dialog-body space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Engineering"
                  className="h-11"
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
                  className="h-11"
                />
              </div>
              <DialogFooter className="app-dialog-footer">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowTeamForm(false);
                    setNewTeamName("");
                    setNewTeamDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingTeam || !newTeamName.trim()}>
                  {isCreatingTeam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Team
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!accessTeam && permissions.canReadRoles}
          onOpenChange={(open) => {
            if (!open) {
              setAccessTeamId(null);
              setPendingTeamRoleId("");
            }
          }}
        >
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="border-b border-border px-6 py-5">
              <DialogTitle>Team access</DialogTitle>
              <DialogDescription>
                {accessTeam
                  ? `${accessTeam.name} inherits access through attached roles.`
                  : "Team roles add inherited access. They do not replace a member's organization role."}
              </DialogDescription>
            </DialogHeader>

            {accessTeam ? (
              <div className="space-y-6 px-6 py-5">
                <div className="rounded-[16px] border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Team roles add inherited access. They do not replace a member&apos;s organization role.
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Assigned roles</h3>
                    <span className="text-xs text-muted-foreground">
                      {accessTeam.roleAssignments?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {accessTeam.roleAssignments?.length ? (
                      accessTeam.roleAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-[16px] border border-border px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {assignment.role.name}
                                </p>
                                {assignment.role.isDefault ? (
                                  <Badge variant="secondary" className="text-[11px]">
                                    Default
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {assignment.role.description || "No role description provided."}
                              </p>
                            </div>

                            {permissions.canAssignTeamRoles ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveTeamRole(accessTeam.id, assignment.roleId)}
                                disabled={isRemovingTeamRole}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {assignment.role.policyAttachments.length ? (
                              assignment.role.policyAttachments.map(({ policy }) => (
                                <Badge key={policy.id} variant="outline" className="font-normal">
                                  {policy.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No attached policies.</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        No roles assigned to this team.
                      </div>
                    )}
                  </div>
                </div>

                {permissions.canAssignTeamRoles ? (
                  <div className="space-y-3 rounded-[16px] border border-border p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Add role</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Attach an existing role to grant this team inherited access.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Select value={pendingTeamRoleId} onValueChange={setPendingTeamRoleId}>
                        <SelectTrigger className="sm:flex-1">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoleItems.length ? (
                            assignableRoleItems.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none__" disabled>
                              No more roles available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        onClick={handleAssignTeamRole}
                        disabled={!pendingTeamRoleId || isAssigningTeamRole}
                      >
                        {isAssigningTeamRole ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Attach Role
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAccessTeamId(null);
                  setPendingTeamRoleId("");
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
