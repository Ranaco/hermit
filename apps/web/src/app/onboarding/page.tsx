"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateOrganization } from "@/hooks/use-organizations";
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
import { Building2, Loader2 } from "lucide-react";

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
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/50 to-accent/10 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-primary text-primary-foreground shadow-md border-2 border-border rounded-md">
            <Building2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Hermes KMS!</CardTitle>
          <CardDescription className="text-base">
            Let&apos;s get started by creating your first organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="text-base"
                />
                <p className="text-sm text-muted-foreground">
                  This will be the primary workspace for your team
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  placeholder="e.g., Main organization for managing company secrets"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Help your team understand the purpose of this organization
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span>✓</span> What you&apos;ll get:
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Full access as the organization owner</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Ability to create vaults for organizing your keys and secrets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Invite team members and manage their roles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Secure key management with encryption and access control</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 shadow-md"
                disabled={isPending || !name.trim()}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
