"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    // Wait for Zustand persist to hydrate from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g. store was cached), set immediately
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated && isProtected(pathname)) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }

    if (isAuthenticated && isGuestOnly(pathname)) {
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

  // Don't render login if authenticated (redirect is pending)
  if (hydrated && isAuthenticated && isGuestOnly(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
