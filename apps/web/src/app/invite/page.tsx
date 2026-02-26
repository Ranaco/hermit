"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";
import { organizationService } from "@/services/organization.service";
import { toast } from "sonner";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const hasAttempted = React.useRef(false);

  // We define handleAccept first so we can call it in the effect
  const handleAccept = async () => {
    if (!token) return;
    setStatus("loading");
    try {
      await organizationService.acceptInvitation(token);
      setStatus("success");
      toast.success("Invitation accepted successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error: any) {
      setStatus("error");
      if (error?.response?.status === 401) {
        toast.info("Please log in to accept the invitation");
        router.push(`/login?returnUrl=/invite?token=${token}`);
      } else {
        setErrorMessage(
          error?.response?.data?.error?.message || 
          "Failed to accept invitation. It may be invalid or expired."
        );
        toast.error("Failed to accept invitation");
      }
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token provided.");
    } else if (!hasAttempted.current) {
      hasAttempted.current = true;
      handleAccept();
    }
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-primary text-primary-foreground shadow-md border-2 border-border rounded-md">
          <Building2 className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-bold">Organization Invite</CardTitle>
        <CardDescription className="text-base">
          You have been invited to join an organization on Hermes KMS
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {status === "success" ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-6 text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-16 w-16" />
            <p className="text-lg font-medium text-center">Invitation Accepted!</p>
            <p className="text-sm text-muted-foreground text-center">Redirecting you to the dashboard...</p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6 w-full">
            <div className="rounded-lg bg-destructive/10 p-4 w-full">
              <p className="text-sm font-medium text-destructive text-center">{errorMessage}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-center text-muted-foreground">
                Processing your invitation...
              </p>
            </div>
            <Button
              className="w-full shadow-md"
              size="lg"
              disabled={true}
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting...
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/50 to-accent/10 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      }>
        <InviteContent />
      </Suspense>
    </div>
  );
}
