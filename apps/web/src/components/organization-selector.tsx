"use client";

import { useEffect } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useOrganizations } from "@/hooks/use-organizations";
import { useOrganizationStore } from "@/store/organization.store";

interface OrganizationSelectorProps {
  onCreateNew?: () => void;
}

export function OrganizationSelector({ onCreateNew }: OrganizationSelectorProps) {
  const { data: organizations, isLoading } = useOrganizations();
  const { currentOrganization, setCurrentOrganization, clearVault } = useOrganizationStore();

  useEffect(() => {
    if (!organizations) {
      return;
    }

    if (organizations.length === 0) {
      if (currentOrganization) {
        setCurrentOrganization(null);
        clearVault();
      }
      return;
    }

    if (!currentOrganization) {
      setCurrentOrganization(organizations[0]);
      return;
    }

    const matchingOrganization = organizations.find((organization) => organization.id === currentOrganization.id);

    if (!matchingOrganization) {
      setCurrentOrganization(organizations[0]);
      clearVault();
      return;
    }

    if (
      matchingOrganization.name !== currentOrganization.name ||
      matchingOrganization.description !== currentOrganization.description ||
      matchingOrganization.userRole !== currentOrganization.userRole
    ) {
      setCurrentOrganization(matchingOrganization);
    }
  }, [organizations, currentOrganization, setCurrentOrganization, clearVault]);

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

  const organizationItems = organizations.map((org) => ({
    value: org.id,
    label: org.name,
    description: org.userRole ? `Role: ${org.userRole}` : undefined,
    keywords: [org.userRole || ""],
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="org-select" className="sr-only">
          Select Organization
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Combobox
            items={organizationItems}
            value={currentOrganization?.id}
            placeholder="Select organization"
            searchPlaceholder="Search organizations..."
            emptyText="No organizations found."
            onValueChange={handleSelectOrganization}
            triggerClassName="border-sidebar-border bg-sidebar/95 pl-10 pr-4 focus-visible:ring-sidebar-ring"
          />
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
