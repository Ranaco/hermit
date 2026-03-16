/**
 * Onboarding Wizard Component
 * Guides new users through organization setup
 */

"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";

import {
  Building2,
  Vault,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  useCreateFirstOrganization,
  useCompleteOnboarding,
} from "@/hooks/use-onboarding";
import { useOrganizationStore } from "@/store/organization.store";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  const { setCurrentOrganization, setCurrentVault } = useOrganizationStore();
  const createOrg = useCreateFirstOrganization();
  const completeOnboarding = useCompleteOnboarding();

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) return;

    try {
      const result = await createOrg.mutateAsync({
        name: orgName.trim(),
        description: orgDescription.trim() || undefined,
      });

      // Set current organization and vault in store
      setCurrentOrganization({
        id: result.organization.id,
        name: result.organization.name,
        description: result.organization.description,
      });

      setCurrentVault({
        id: result.vault.id,
        name: result.vault.name,
        organizationId: result.organization.id,
      });

      setCreatedOrgId(result.organization.id);
      setStep(2);
    } catch (error) {
      console.error("Failed to create organization:", error);
    }
  };

  const handleComplete = async () => {
    if (!createdOrgId) return;

    try {
      await completeOnboarding.mutateAsync(createdOrgId);
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  };

  if (step === 2) {
    return (
      <AuthShell
        eyebrow="Complete"
        title="Workspace ready"
        description="Organization and vault are provisioned."
        asideTitle="All set."
        asideDescription="Start adding keys and secrets."
        features={[
          {
            icon: <Building2 className="h-4 w-4" />,
            title: orgName,
            detail: orgDescription || "Your organization",
          },
          {
            icon: <Vault className="h-4 w-4" />,
            title: "Default Vault",
            detail: "Ready for encryption keys.",
          },
        ]}
        footerNote="Add vaults and invite teammates from the dashboard."
      >
        <div className="space-y-7">
          <div className="rounded-[18px] border border-border bg-muted/30 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">All set</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Organization and vault are ready to use.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Next steps
            </p>
            <div className="space-y-3">
              {[
                "Create encryption keys in your vault",
                "Store secrets securely using your keys",
                "Invite team members to collaborate",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleComplete}
            disabled={completeOnboarding.isPending}
            className="h-12 w-full rounded-2xl text-base font-medium shadow-none"
          >
            {completeOnboarding.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizing...
              </>
            ) : (
              "Go to Dashboard"
            )}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Setup"
      title="Create your organization"
      description="Everything starts here — vaults, keys, and team."
      asideTitle="Start here."
      asideDescription="Organizations own vaults, keys, and access policy."
      features={[
        {
          icon: <Vault className="h-4 w-4" />,
          title: "Default vault",
          detail: "Created automatically with your organization.",
        },
        {
          icon: <KeyRound className="h-4 w-4" />,
          title: "Transit encryption",
          detail: "Keys managed through HashiCorp Vault transit.",
        },
        {
          icon: <Lock className="h-4 w-4" />,
          title: "Role-based access",
          detail: "Scoped to your organization from the start.",
        },
      ]}
      footerNote="Next step: your dashboard."
    >
      <div className="space-y-7">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org-name">
              Organization name
            </Label>
            <Input
              id="org-name"
              placeholder="Acme Corporation"
              value={orgName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setOrgName(e.target.value)
              }
              disabled={createOrg.isPending}
              className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="org-description">Description</Label>
              <span className="text-xs font-medium text-muted-foreground">
                Optional
              </span>
            </div>
            <Input
              id="org-description"
              placeholder="Describe your organization"
              value={orgDescription}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setOrgDescription(e.target.value)
              }
              disabled={createOrg.isPending}
              className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
            />
          </div>
        </div>

        <Button
          onClick={handleCreateOrganization}
          disabled={!orgName.trim() || createOrg.isPending}
          className="h-12 w-full rounded-2xl text-base font-medium shadow-none"
        >
          {createOrg.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              Create Organization
            </>
          )}
        </Button>
      </div>
    </AuthShell>
  );
}
