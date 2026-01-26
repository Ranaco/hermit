"use client";

import { useEffect } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOrganizations } from "@/hooks/use-organizations";
import { useOrganizationStore } from "@/store/organization.store";

interface OrganizationSelectorProps {
  onCreateNew?: () => void;
}

export function OrganizationSelector({ onCreateNew }: OrganizationSelectorProps) {
  const { data: organizations, isLoading } = useOrganizations();
  const { currentOrganization, setCurrentOrganization, clearContext } = useOrganizationStore();

  // Auto-select first organization if none selected
  useEffect(() => {
    if (!currentOrganization && organizations && organizations.length > 0) {
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, currentOrganization, setCurrentOrganization]);

  const handleSelectOrganization = (orgId: string) => {
    const org = organizations?.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      clearContext(); // Clear vault context when switching orgs
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Building2 className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={onCreateNew}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Organization
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="org-select" className="sr-only">Select Organization</Label>
        <div className="relative flex items-center">
          <Building2 className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            id="org-select"
            value={currentOrganization?.id || ""}
            onChange={(e) => handleSelectOrganization(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} {org.userRole && `(${org.userRole})`}
              </option>
            ))}
          </select>
        </div>
      </div>
      {onCreateNew && (
        <Button variant="outline" size="icon" onClick={onCreateNew} title="Create New Organization">
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
