"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Loader2, Lock, Vault } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateOrganization } from "@/hooks/use-organizations";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { mutate: createOrganization, isPending } = useCreateOrganization();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    createOrganization(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
      },
    );
  };

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
      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              placeholder="Acme Security"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="description">Description</Label>
              <span className="text-xs font-medium text-muted-foreground">Optional</span>
            </div>
            <Input
              id="description"
              placeholder="Production secrets and access controls"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-2xl text-base font-medium shadow-none"
          disabled={isPending || !name.trim()}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              Create organization
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
