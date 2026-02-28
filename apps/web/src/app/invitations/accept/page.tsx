"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAcceptInvitation } from "@/hooks/use-organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const { isAuthenticated } = useAuthStore();
  const { mutate: acceptInvitation, isPending, isError, error } = useAcceptInvitation();
  
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login with callback URL
      const callbackUrl = encodeURIComponent(`/invitations/accept?token=${token}`);
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }

    if (!hasAttempted) {
      setHasAttempted(true);
      acceptInvitation(token, {
        onSuccess: (data) => {
          router.push("/dashboard"); 
        },
        onError: () => {
          setHasAttempted(true); 
        }
      });
    }
  }, [token, isAuthenticated, acceptInvitation, router, hasAttempted]);

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>No invitation token was provided.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            {isPending ? (
                <>
                    <CardTitle>Accepting Invitation</CardTitle>
                    <CardDescription>Please wait while we process your invitation...</CardDescription>
                </>
            ) : isError ? (
                <>
                    <CardTitle className="text-destructive">Invitation Failed</CardTitle>
                    <CardDescription>{(error as any)?.response?.data?.message || "There was an error accepting the invitation."}</CardDescription>
                </>
            ) : hasAttempted ? (
                 <>
                    <CardTitle className="text-green-600">Success!</CardTitle>
                    <CardDescription>Redirecting you to the dashboard...</CardDescription>
                </>
            ) : (
                <>
                    <CardTitle>Processing...</CardTitle>
                    <CardDescription>Verifying your session...</CardDescription>
                </>
            )}
        </CardHeader>
        <CardContent className="flex justify-center">
          {isPending && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {isError && (
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="mt-4">
                  Go to Dashboard
              </Button>
          )}
        </CardContent>
      </Card>
  );
}

export default function AcceptInvitationPage() {
    return (
        <div className="flex h-screen items-center justify-center bg-muted/20">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <AcceptInvitationContent />
            </Suspense>
        </div>
    )
}
