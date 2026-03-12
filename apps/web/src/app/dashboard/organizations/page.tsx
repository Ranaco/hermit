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
import { Combobox } from "@/components/ui/combobox";
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

const DEFAULT_ROLE_VALUE = "__member__";

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

  const roleItems = orgRoles?.map((role) => ({
    value: role.id,
    label: role.name,
    description: role.description || undefined,
  })) || [];

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
      <div className="space-y-8 max-w-7xl mx-auto">
        <section className="cupertino-glass-panel !p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Teams & Organizations</h1>
              <p className="text-[15px] font-medium text-muted-foreground mt-2">
                Manage tenant boundaries, member roles, and team assignments for access control.
              </p>
            </div>
            <Button
              className="rounded-2xl"
              onClick={() => setShowCreateForm((v) => !v)}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Organization
            </Button>
          </div>

          <div
            className={cn(
              "grid gap-4 overflow-hidden transition-all duration-500 ease-in-out",
              showCreateForm ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"
            )}
          >
            <div className="min-h-0">
              <form onSubmit={handleCreateOrg} className="grid gap-4 rounded-[20px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-5 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="new-org-name" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Name</Label>
                  <Input
                    id="new-org-name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Acme Security"
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="new-org-description" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Description</Label>
                  <Input
                    id="new-org-description"
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                    placeholder="Production KMS tenant"
                    className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5"
                  />
                </div>
                <div className="flex items-end gap-3 md:col-span-1">
                  <Button type="submit" className="h-11 rounded-xl px-6" disabled={isCreating || !newOrgName}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl px-6"
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
            </div>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {organizations?.map((org) => {
            const isActive = selectedOrg?.id === org.id || currentOrganization?.id === org.id;
            return (
              <button
                key={org.id}
                className={cn(
                  "cupertino-glass-panel text-left flex flex-col justify-between group",
                  isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl" : "hover:border-primary/20"
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
                      "rounded-2xl p-3 flex items-center justify-center transition-colors",
                      isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-black/5 dark:bg-white/10 text-primary group-hover:bg-primary/10"
                    )}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[16px] font-bold tracking-tight leading-tight mb-1">{org.name}</p>
                      <p className="text-[13px] font-medium text-muted-foreground line-clamp-1">{org.description || "No description provided"}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-4">
                  <div className="flex items-center gap-4 text-[13px] font-semibold text-muted-foreground">
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
            <Card className="cupertino-glass-panel !p-0 overflow-hidden flex flex-col">
              <CardHeader className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 lg:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 w-full">
                    {editingOrg?.id === selectedOrg.id ? (
                      <form onSubmit={handleUpdateOrg} className="space-y-3">
                        <Input
                          value={editingOrg.name}
                          onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                          className="h-11 rounded-xl text-lg font-bold"
                        />
                        <Input
                          value={editingOrg.description || ""}
                          onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                          placeholder="Description"
                          className="h-11 rounded-xl"
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" className="rounded-xl h-10 px-5" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="rounded-xl h-10" onClick={() => setEditingOrg(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <CardTitle className="text-2xl font-bold tracking-tight">{selectedOrg.name}</CardTitle>
                        <p className="text-[15px] font-medium text-muted-foreground">{selectedOrg.description || "No description provided"}</p>
                      </>
                    )}
                  </div>

                  {editingOrg?.id !== selectedOrg.id && (
                    <div className="flex gap-2 shrink-0">
                      {permissions.canEditOrganization && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-xl h-10 w-10 shadow-none border-transparent"
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
                          className="rounded-xl h-10 w-10 shadow-none border-transparent"
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
                  <h3 className="text-lg font-bold tracking-tight">Members</h3>
                  {permissions.canInviteUsers && (
                    <Button size="sm" className="rounded-xl h-9" onClick={() => setShowInviteForm((v) => !v)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </Button>
                  )}
                </div>

                {showInviteForm && (
                  <form onSubmit={handleInviteUser} className="mb-6 grid gap-4 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-5 shadow-inner">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="h-11 rounded-xl flex-1 bg-background"
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
                      <Button type="submit" size="sm" className="rounded-xl h-10 px-6" disabled={isInviting || !inviteEmail}>
                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invite
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-xl h-10 px-4"
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

                <div className="space-y-3">
                  {selectedOrg.members?.map((member) => (
                    <div key={member.id} className="group flex items-center justify-between rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-inner">
                          {displayName(member).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[15px] font-bold tracking-tight text-foreground">{displayName(member)}</p>
                          <p className="text-[13px] font-medium text-muted-foreground mt-0.5">{member.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {permissions.canManageRoles ? (
                          <Select
                            value={member.roleId || DEFAULT_ROLE_VALUE}
                            onValueChange={(value) => handleUpdateRole(member.userId, value === DEFAULT_ROLE_VALUE ? "" : value)}
                            disabled={isUpdatingRole}
                          >
                            <SelectTrigger className="h-9 min-w-[140px] border-transparent bg-black/5 text-[13px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20">
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
                            className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-destructive hover:bg-destructive/10"
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
                     <div className="flex flex-col items-center justify-center text-center p-8 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                        <Users className="h-8 w-8 text-muted-foreground/50 mb-3" />
                        <p className="text-[15px] font-semibold text-foreground">No members yet</p>
                        <p className="text-[13px] text-muted-foreground mt-1">Invite people to your organization to get started</p>
                     </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="cupertino-glass-panel !p-0 overflow-hidden flex flex-col">
              <CardHeader className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 lg:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Teams</CardTitle>
                    <p className="text-[15px] font-medium text-muted-foreground mt-1.5">Configure access groups and policies.</p>
                  </div>
                  <Button size="icon" variant="secondary" className="rounded-xl h-10 w-10 shadow-none border-transparent" onClick={() => setShowTeamForm((v) => !v)}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 lg:p-8 flex-1 space-y-6">
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-500 ease-in-out",
                    showTeamForm ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <form onSubmit={handleCreateTeam} className="space-y-4 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-5 shadow-inner mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="team-name" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Team Name</Label>
                      <Input
                        id="team-name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Engineering"
                        className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-description" className="text-[13px] font-bold tracking-wide uppercase text-muted-foreground">Description</Label>
                      <Input
                        id="team-description"
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        placeholder="Handles infra and runtime secrets"
                        className="h-11 rounded-xl bg-background border-black/5 dark:border-white/5"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" size="sm" className="h-10 rounded-xl px-6" disabled={isCreatingTeam || !newTeamName.trim()}>
                        {isCreatingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Team
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-10 rounded-xl px-4"
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
                </div>

                <div className="space-y-4">
                  {teams?.map((team) => (
                    <div key={team.id} className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[16px] font-bold tracking-tight text-foreground">{team.name}</p>
                          <p className="text-[13px] font-medium text-muted-foreground mt-1">{team.description || "No description provided"}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTeam(team.id)} disabled={isDeletingTeam}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {team.members?.map((membership) => (
                          <div key={membership.id} className="inline-flex items-center gap-2 rounded-full border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/10 pl-2.5 pr-1.5 py-1 text-[12px] font-semibold text-foreground">
                            <span>{membership.user.email}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full p-1 transition-colors"
                              onClick={() => handleRemoveTeamMember(team.id, membership.userId)}
                              disabled={isRemovingTeamMember}
                              aria-label="Remove team member"
                            >
                              <Plus className="h-3 w-3 rotate-45" />
                            </button>
                          </div>
                        ))}
                      </div>

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
                          className="h-10 w-10 rounded-xl"
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

                  {(!teams || teams.length === 0) && !showTeamForm && (
                     <div className="flex flex-col items-center justify-center text-center py-10 px-6 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                        <Layers className="h-10 w-10 text-muted-foreground/40 mb-4" />
                        <p className="text-[15px] font-semibold text-foreground">No Teams Built</p>
                        <p className="text-[13px] text-muted-foreground mt-1 max-w-[200px]">Create a new team to manage scopes and group permissions.</p>
                     </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="cupertino-glass-panel flex flex-col items-center justify-center min-h-[400px] text-center p-8">
             <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
             <h2 className="text-xl font-bold tracking-tight text-foreground">No Organization Selected</h2>
             <p className="text-[15px] text-muted-foreground mt-2 max-w-md">Select an organization from the list above to manage its members, teams, and configurations.</p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
