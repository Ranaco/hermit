"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { organizationService } from "@/services/organization.service";
import { toast } from "sonner";

type InviteStatus = "idle" | "loading" | "success" | "error";

type InviteApiError = {
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
      };
    };
  };
};

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasAttempted = useRef(false);

  const [status, setStatus] = useState<InviteStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleAccept = async () => {
    if (!token) {
      return;
    }

    setStatus("loading");

    try {
      await organizationService.acceptInvitation(token);
      setStatus("success");
      toast.success("Invitation accepted successfully");
      window.setTimeout(() => {
        router.push("/dashboard");
      }, 1400);
    } catch (error) {
      const inviteError = error as InviteApiError;

      setStatus("error");

      if (inviteError.response?.status === 401) {
        toast.info("Please sign in to accept this invitation");
        router.push(`/login?returnUrl=${encodeURIComponent(`/invite?token=${token}`)}`);
        return;
      }

      setErrorMessage(
        inviteError.response?.data?.error?.message ||
          "This invitation is invalid, expired, or no longer available.",
      );
      toast.error("Unable to accept invitation");
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token was provided.");
      return;
    }

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      void handleAccept();
    }
  }, [token]);

  return (
    <AuthShell
      eyebrow="Invitation Flow"
      title="Join your Hermit organization"
      description="Invitation links are processed automatically."
      asideTitle="Direct workspace entry."
      asideDescription="Identity and membership stay aligned."
      features={[]}
      footerNote="Membership changes stay explicit."
    >
      {status === "success" ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-foreground">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Invitation accepted</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Redirecting to the dashboard.
            </p>
          </div>
          <Button className="h-12 w-full text-base font-medium" onClick={() => router.push("/dashboard")}>
            Enter dashboard
          </Button>
        </div>
      ) : status === "error" ? (
        <div className="space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-foreground">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="border-b border-border pb-4">
            <p className="text-sm font-medium text-foreground">Invitation unavailable</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{errorMessage}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="h-12 flex-1 text-base font-medium" onClick={() => router.push("/")}>
              Return home
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 text-base font-medium"
              onClick={() => token && void handleAccept()}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="border-b border-border pb-4 text-sm leading-6 text-muted-foreground">
            Validating invitation.
          </div>
          <Button className="h-12 w-full text-base font-medium" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing invitation...
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading invitation flow...
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
