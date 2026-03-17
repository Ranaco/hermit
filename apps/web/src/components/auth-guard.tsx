"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/invite"];
const GUEST_ONLY = ["/login"];

function isProtected(path: string) {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function isGuestOnly(path: string) {
  return GUEST_ONLY.some((p) => path === p || path.startsWith(p + "/"));
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  // Track if the user was already authenticated when the guard first hydrated.
  // This prevents the guard from hijacking the login page's own post-auth
  // redirect (e.g. register → /onboarding) by only redirecting users who
  // land on /login while *already* logged in.
  const wasAuthOnHydrate = useRef<boolean | null>(null);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, []);

  // Capture initial auth state once hydration completes
  useEffect(() => {
    if (hydrated && wasAuthOnHydrate.current === null) {
      wasAuthOnHydrate.current = isAuthenticated;
    }
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated && isProtected(pathname)) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }

    // Only redirect away from /login if the user was already authenticated
    // when the page loaded — not if they just logged in/registered on this page.
    if (isAuthenticated && isGuestOnly(pathname) && wasAuthOnHydrate.current) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  // Show loader while hydrating on protected/guest routes
  if (!hydrated && (isProtected(pathname) || isGuestOnly(pathname))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render protected content if not authenticated (redirect is pending)
  if (hydrated && !isAuthenticated && isProtected(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render login if authenticated and was already auth'd (redirect pending)
  if (hydrated && isAuthenticated && isGuestOnly(pathname) && wasAuthOnHydrate.current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
