"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, KeyRound, Vault, Plus, FileCode2 } from "lucide-react";
import { usePolicies, useRoles, useCreatePolicy, useUpdatePolicy, useDeletePolicy, useCreateRole, useUpdateRole } from "@/hooks/use-policies";
import { PolicyEditor } from "@/components/policy-editor";

export default function PoliciesPage() {
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const { data: policies = [], isLoading: isLoadingPolicies } = usePolicies();
  
  const createPolicy = useCreatePolicy();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();

  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isEditPolicyDialogOpen, setIsEditPolicyDialogOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  // Policy Form State
  const [policyName, setPolicyName] = useState("");
  const [policyDescription, setPolicyDescription] = useState("");
  const [policyJson, setPolicyJson] = useState('[\n  {\n    "effect": "ALLOW",\n    "actions": ["secrets:*"],\n    "resources": ["*"]\n  }\n]');
  
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Role Form State
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const statements = JSON.parse(policyJson);
      createPolicy.mutate({
        name: policyName,
        description: policyDescription,
        statements,
      }, {
        onSuccess: () => {
          setIsPolicyDialogOpen(false);
          setPolicyName("");
          setPolicyDescription("");
          setPolicyJson("[\n  {\n    \"effect\": \"ALLOW\",\n    \"actions\": [\"secrets:*\"],\n    \"resources\": [\"*\"]\n  }\n]");
        }
      });
    } catch (error) {
      alert("Invalid JSON format for statements");
    }
  };

  const handleUpdatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicyId) return;
    try {
      const statements = JSON.parse(policyJson);
      updatePolicy.mutate({
        policyId: editingPolicyId,
        data: {
          name: policyName,
          description: policyDescription,
          statements,
        }
      }, {
        onSuccess: () => {
          setIsEditPolicyDialogOpen(false);
          setEditingPolicyId(null);
          setPolicyName("");
          setPolicyDescription("");
          setPolicyJson('[\n  {\n    "effect": "ALLOW",\n    "actions": ["secrets:*"],\n    "resources": ["*"]\n  }\n]');
        }
      });
    } catch (error) {
      alert("Invalid JSON format for statements");
    }
  };

  const openEditPolicyDialog = (policy: any) => {
    setEditingPolicyId(policy.id);
    setPolicyName(policy.name);
    setPolicyDescription(policy.description || "");
    const statements = policy.document?.statements || policy.statements || [];
    setPolicyJson(JSON.stringify(statements, null, 2));
    setIsEditPolicyDialogOpen(true);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    createRole.mutate({
      name: roleName,
      description: roleDescription,
      policyIds: selectedPolicies,
    }, {
      onSuccess: () => {
        setIsRoleDialogOpen(false);
        setRoleName("");
        setRoleDescription("");
        setSelectedPolicies([]);
      }
    });
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoleId) return;
    
    updateRole.mutate({
      roleId: editingRoleId,
      data: {
        name: roleName,
        description: roleDescription,
        policyIds: selectedPolicies
      }
    }, {
      onSuccess: () => {
        setIsEditRoleDialogOpen(false);
        setEditingRoleId(null);
        setRoleName("");
        setRoleDescription("");
        setSelectedPolicies([]);
      }
    });
  };

  const openEditRoleDialog = (role: any) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPolicies(role.policyAttachments?.map((pa: any) => pa.policy.id) || []);
    setIsEditRoleDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-10">
        
        {/* CUSTOM ROLES SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="kms-title">Custom Roles</h1>
              <p className="kms-subtitle mt-2">Aggregate identity definitions mapped to Organization users and teams.</p>
            </div>
            
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl"><Plus className="mr-2 h-4 w-4"/> Create Role</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleCreateRole}>
                  <DialogHeader>
                    <DialogTitle>Create Custom Role</DialogTitle>
                    <DialogDescription>Define a new organizational role by selecting underlying policies.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleName">Name</Label>
                      <Input id="roleName" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. SRE Root" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleDesc">Description</Label>
                      <Input id="roleDesc" value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="Grants sweeping access..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Attach Policies</Label>
                      <div className="grid gap-2 border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/20">
                        {policies.length === 0 && <p className="text-sm text-muted-foreground p-2">No policies created yet.</p>}
                        {policies.map(p => (
                          <label key={p.id} className="flex items-center space-x-2 text-sm">
                            <Checkbox
                              checked={selectedPolicies.includes(p.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedPolicies(prev => [...prev, p.id]);
                                else setSelectedPolicies(prev => prev.filter(id => id !== p.id));
                              }}
                            />
                            <span>{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createRole.isPending} className="w-full sm:w-auto">
                      {createRole.isPending ? "Creating..." : "Create Role"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {isLoadingRoles && <p className="text-sm text-muted-foreground">Loading roles...</p>}
            {!isLoadingRoles && roles.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/40 p-4 border rounded-xl">No custom roles found. Create one to get started.</p>
            )}
            {roles.map((role) => (
              <Card key={role.id} className="kms-surface border-border/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {role.name}
                        {role.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </CardTitle>
                      {role.description && <CardDescription className="mt-1">{role.description}</CardDescription>}
                    </div>
                    {!role.isDefault && (
                      <Button variant="outline" size="sm" onClick={() => openEditRoleDialog(role)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold">Attached Policies ({role.policyAttachments?.length || 0})</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {role.policyAttachments && role.policyAttachments.length > 0 ? (
                        role.policyAttachments.map((pa) => (
                          <Badge key={pa.policy.id} variant="outline" className="rounded-full px-3 py-1 flex items-center gap-1.5 bg-background">
                            <Shield className="h-3 w-3 text-primary" />
                            {pa.policy.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None attached</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                    <span className="inline-flex items-center gap-1"><Vault className="h-3.5 w-3.5" /> ID: {role.id.split('-')[0]}</span>
                    <span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> IAM Enabled</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleUpdateRole}>
                <DialogHeader>
                  <DialogTitle>Edit Custom Role</DialogTitle>
                  <DialogDescription>Modify the assigned policies for this role.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="editRoleName">Name</Label>
                    <Input id="editRoleName" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. SRE Root" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editRoleDesc">Description</Label>
                    <Input id="editRoleDesc" value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="Grants sweeping access..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="grid gap-2 border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/20">
                      {policies.length === 0 && <p className="text-sm text-muted-foreground p-2">No policies created yet.</p>}
                        {policies.map(p => (
                          <label key={p.id} className="flex items-center space-x-2 text-sm">
                            <Checkbox
                              checked={selectedPolicies.includes(p.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedPolicies(prev => [...prev, p.id]);
                                else setSelectedPolicies(prev => prev.filter(id => id !== p.id));
                              }}
                            />
                            <span>{p.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateRole.isPending} className="w-full sm:w-auto">
                    {updateRole.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        </section>


        {/* HYPER-GRANULAR POLICIES SECTION */}
        <section className="space-y-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="kms-title text-2xl">Policy Definitions</h1>
              <p className="kms-subtitle mt-2">Granular JSON statements defining exact resource allowances via URNs.</p>
            </div>
            
            <Dialog open={isPolicyDialogOpen} onOpenChange={(open) => {
               setIsPolicyDialogOpen(open);
               if (open) {
                 setPolicyName("");
                 setPolicyDescription("");
                 setPolicyJson('[\n  {\n    "effect": "ALLOW",\n    "actions": [],\n    "resources": ["*"]\n  }\n]');
               }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl"><FileCode2 className="mr-2 h-4 w-4"/> New Policy</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleCreatePolicy}>
                  <DialogHeader>
                    <DialogTitle>Create Validated JSON Policy</DialogTitle>
                    <DialogDescription>Input the raw AWS-style policy statements granting or denying resource operations.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="polName">Name</Label>
                        <Input id="polName" value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="e.g. Read Secrets Only" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="polDesc">Description</Label>
                        <Input id="polDesc" value={policyDescription} onChange={e => setPolicyDescription(e.target.value)} placeholder="Optional" />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <PolicyEditor value={policyJson} onChange={setPolicyJson} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createPolicy.isPending} className="w-full sm:w-auto">
                      {createPolicy.isPending ? "Validating & Creating..." : "Save Policy"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {isLoadingPolicies && <p className="text-sm text-muted-foreground">Loading policies...</p>}
            {!isLoadingPolicies && policies.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/40 p-4 border rounded-xl">No policies defined.</p>
            )}
            {policies.map((policy) => (
              <div key={policy.id} className="rounded-xl border border-border/80 bg-background/50 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b bg-muted/10">
                  <div>
                    <h3 className="font-semibold">{policy.name}</h3>
                    {policy.description && <p className="text-sm text-muted-foreground mt-0.5">{policy.description}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="font-mono text-[10px]">{policy.id}</Badge>
                    {!("isManaged" in policy ? policy.isManaged : false) && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditPolicyDialog(policy)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => {
                          if (confirm(`Delete policy "${policy.name}"?`)) {
                            deletePolicy.mutate(policy.id);
                          }
                        }}>Delete</Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-0">
                  <pre className="p-5 text-xs text-muted-foreground font-mono overflow-x-auto m-0 bg-[#0c0c0e]">
                    <code>{JSON.stringify((policy as any).document?.statements || (policy as any).statements, null, 2)}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={isEditPolicyDialogOpen} onOpenChange={setIsEditPolicyDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleUpdatePolicy}>
                <DialogHeader>
                  <DialogTitle>Edit Validated JSON Policy</DialogTitle>
                  <DialogDescription>Modify the raw AWS-style policy statements granting or denying resource operations.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editPolName">Name</Label>
                      <Input id="editPolName" value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="e.g. Read Secrets Only" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPolDesc">Description</Label>
                      <Input id="editPolDesc" value={policyDescription} onChange={e => setPolicyDescription(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <PolicyEditor value={policyJson} onChange={setPolicyJson} />
                  </div>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditPolicyDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updatePolicy.isPending} className="w-full sm:w-auto">
                    {updatePolicy.isPending ? "Validating & Saving..." : "Save Policy"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        </section>

      </div>
    </DashboardLayout>
  );
}
