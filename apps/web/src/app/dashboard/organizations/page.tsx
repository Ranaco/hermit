"use client";

import { useState } from "react";
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useInviteUser,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/hooks/use-organizations";
import { useOrganizationStore } from "@/store/organization.store";
import { useRBAC } from "@/hooks/use-rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Plus,
  Users,
  Trash2,
  Mail,
  Shield,
  Edit,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OrganizationsPage() {
  const { data: organizations, isLoading } = useOrganizations();
  const { currentOrganization, setCurrentOrganization } = useOrganizationStore();
  const permissions = useRBAC();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Form states
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [editingOrg, setEditingOrg] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "ADMIN" | "MEMBER">("MEMBER");

  // Mutations
  const { mutate: createOrg, isPending: isCreating } = useCreateOrganization();
  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrganization();
  const { mutate: deleteOrg, isPending: isDeleting } = useDeleteOrganization();
  const { mutate: inviteUser, isPending: isInviting } = useInviteUser();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateMemberRole();

  const selectedOrg = organizations?.find(org => org.id === (selectedOrgId || currentOrganization?.id));

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    createOrg(
      { name: newOrgName, description: newOrgDescription || undefined },
      {
        onSuccess: (data) => {
          setNewOrgName("");
          setNewOrgDescription("");
          setShowCreateForm(false);
          setCurrentOrganization(data);
        },
      }
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
      }
    );
  };

  const handleDeleteOrg = (id: string) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return;
    }
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
        data: { email: inviteEmail, role: inviteRole },
      },
      {
        onSuccess: () => {
          setInviteEmail("");
          setInviteRole("MEMBER");
          setShowInviteForm(false);
        },
      }
    );
  };

  const handleRemoveMember = (userId: string) => {
    if (!selectedOrg) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    removeMember({ organizationId: selectedOrg.id, userId });
  };

  const handleUpdateRole = (userId: string, role: "OWNER" | "ADMIN" | "MEMBER") => {
    if (!selectedOrg) return;

    updateRole({
      organizationId: selectedOrg.id,
      userId,
      data: { role },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and team members
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Organization</CardTitle>
            <CardDescription>
              Create a new organization to manage keys and secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Organization Name *</Label>
                <Input
                  id="new-org-name"
                  placeholder="Acme Corporation"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-org-description">Description</Label>
                <Input
                  id="new-org-description"
                  placeholder="Main organization for managing company secrets"
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating || !newOrgName}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Organization"
                  )}
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
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations?.map((org) => (
          <Card
            key={org.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOrgId === org.id || currentOrganization?.id === org.id
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() => setSelectedOrgId(org.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                </div>
                <Badge variant={org.userRole === "OWNER" ? "default" : "secondary"}>
                  {org.userRole}
                </Badge>
              </div>
              {org.description && (
                <CardDescription className="line-clamp-2">
                  {org.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{org._count?.members || 0} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>{org._count?.vaults || 0} vaults</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedOrg && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {editingOrg?.id === selectedOrg.id ? (
                    <Input
                      value={editingOrg.name}
                      onChange={(e) =>
                        setEditingOrg({ ...editingOrg, name: e.target.value })
                      }
                      className="text-2xl font-bold"
                    />
                  ) : (
                    <>
                      <Building2 className="h-6 w-6" />
                      {selectedOrg.name}
                    </>
                  )}
                </CardTitle>
                {editingOrg?.id === selectedOrg.id ? (
                  <Input
                    value={editingOrg.description || ""}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        description: e.target.value,
                      })
                    }
                    placeholder="Organization description"
                    className="mt-2"
                  />
                ) : (
                  selectedOrg.description && (
                    <CardDescription className="mt-2">
                      {selectedOrg.description}
                    </CardDescription>
                  )
                )}
              </div>
              <div className="flex gap-2">
                {editingOrg?.id === selectedOrg.id ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleUpdateOrg}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingOrg(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    {permissions.canEditOrganization && (
                      <Button
                        size="sm"
                        variant="outline"
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
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteOrg(selectedOrg.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {permissions.canInviteUsers && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowInviteForm(!showInviteForm)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                </div>

                {showInviteForm && (
                  <form
                    onSubmit={handleInviteUser}
                    className="mb-4 p-4 border rounded-lg space-y-3"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <select
                        id="invite-role"
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(
                            e.target.value as "OWNER" | "ADMIN" | "MEMBER"
                          )
                        }
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="MEMBER">Member - Can view and use resources</option>
                        <option value="ADMIN">Admin - Can manage resources and members</option>
                        <option value="OWNER">Owner - Full control</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isInviting}>
                        {isInviting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Inviting...
                          </>
                        ) : (
                          "Send Invitation"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteEmail("");
                          setInviteRole("MEMBER");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {selectedOrg.members?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {member.user.firstName || member.user.lastName
                            ? `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim()
                            : member.user.username || member.user.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {permissions.canManageRoles ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(
                                member.userId,
                                e.target.value as "OWNER" | "ADMIN" | "MEMBER"
                              )
                            }
                            disabled={isUpdatingRole}
                            className="flex h-8 items-center justify-between rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                            <option value="OWNER">Owner</option>
                          </select>
                        ) : (
                          <Badge>{member.role}</Badge>
                        )}
                        {permissions.canRemoveMembers && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
