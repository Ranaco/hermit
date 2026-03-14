"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
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
      eyebrow="Workspace Setup"
      title="Create your first organization"
      description="Start with your workspace boundary."
      asideTitle="Start with the boundary."
      asideDescription="Organizations scope ownership, invites, and policy."
      features={[]}
      footerNote="This boundary anchors access and audit."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5 border-b border-border pb-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[15px] font-semibold">
              Organization name
            </Label>
            <Input
              id="name"
              placeholder="Acme Security"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[15px] font-semibold">
              Description
            </Label>
            <Input
              id="description"
              placeholder="Production secrets and access controls for the platform team"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-base font-medium"
          disabled={isPending || !name.trim()}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating organization...
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
