/**
 * Onboarding Wizard Component
 * Guides new users through organization setup
 */

"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Building2, Vault, CheckCircle2, Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Hermit KMS</CardTitle>
          <CardDescription>
            Let&apos;s set up your secure key management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8 gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
              </div>
              <span className="text-sm font-medium">Organization</span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > 2 ? <CheckCircle2 className="h-5 w-5" /> : "2"}
              </div>
              <span className="text-sm font-medium">Complete</span>
            </div>
          </div>

          {/* Step 1: Create Organization */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Create Your Organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Organizations help you manage team access and resources
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-name"
                    placeholder="e.g., Acme Corporation"
                    value={orgName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setOrgName(e.target.value)}
                    disabled={createOrg.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-description">Description (Optional)</Label>
                  <textarea
                    id="org-description"
                    placeholder="Describe your organization..."
                    value={orgDescription}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setOrgDescription(e.target.value)}
                    disabled={createOrg.isPending}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <Button
                  onClick={handleCreateOrganization}
                  disabled={!orgName.trim() || createOrg.isPending}
                  className="w-full"
                  size="lg"
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
            </div>
          )}

          {/* Step 2: Setup Complete */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border-2 border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    All Set!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your organization and default vault are ready
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border-2 border-border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{orgName}</p>
                      <p className="text-sm text-muted-foreground">
                        {orgDescription || "Your organization"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-3 border-t">
                    <Vault className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Default Vault</p>
                      <p className="text-sm text-muted-foreground">
                        Your default secure vault for storing encryption keys
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border-2 border-blue-500/20 rounded-lg">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                    What&apos;s Next?
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Create encryption keys in your vault</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Store secrets securely using your keys</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Invite team members to collaborate</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleComplete}
                  disabled={completeOnboarding.isPending}
                  className="w-full"
                  size="lg"
                >
                  {completeOnboarding.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
