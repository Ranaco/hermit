"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      router.replace(`/invite?token=${encodeURIComponent(token)}`);
    }
  }, [router, token]);

  if (!token) {
    return (
      <AuthShell
        eyebrow="Legacy Route"
        title="Invitation link is incomplete"
        description="This URL is missing its token."
        asideTitle="One invitation flow."
        asideDescription="Invitation handling stays in one place."
        features={[]}
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-destructive/15 bg-destructive/8 px-4 py-4 text-sm leading-6 text-muted-foreground">
            No invitation token was provided.
          </div>
          <Button
            className="h-12 w-full rounded-2xl text-base font-semibold"
            onClick={() => router.push("/")}
          >
            Return Home
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Legacy Route"
      title="Forwarding invitation"
      description="Redirecting to the primary invitation flow."
      asideTitle="One canonical path."
      asideDescription="The token is preserved automatically."
      features={[]}
    >
      <Button className="h-12 w-full rounded-2xl text-base font-semibold" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Redirecting to invitation flow...
      </Button>
    </AuthShell>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading invitation redirect...
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
