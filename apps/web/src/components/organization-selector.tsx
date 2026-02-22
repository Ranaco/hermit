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
  const { currentOrganization, setCurrentOrganization, clearVault } = useOrganizationStore();

  useEffect(() => {
    if (!currentOrganization && organizations && organizations.length > 0) {
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, currentOrganization, setCurrentOrganization]);

  const handleSelectOrganization = (orgId: string) => {
    const org = organizations?.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      clearVault();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/35 px-3 text-xs text-muted-foreground">
        <Building2 className="h-4 w-4" />
        Loading organizations...
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <Button variant="outline" className="h-10 w-full justify-start rounded-xl" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Create Organization
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="org-select" className="sr-only">
          Select Organization
        </Label>
        <div className="relative flex items-center">
          <Building2 className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <select
            id="org-select"
            value={currentOrganization?.id || ""}
            onChange={(e) => handleSelectOrganization(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-sidebar-border bg-sidebar/95 pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sidebar-ring"
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
      {onCreateNew ? (
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={onCreateNew} title="Create organization">
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
