"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
} from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister } from "@/hooks/use-auth";

type AuthMode = "signin" | "signup";

const modeCopy = {
  signin: {
    eyebrow: "Secure Access",
    title: "Sign in to Hermit",
    description: "Return to your workspace.",
    asideTitle: "Direct access for operators.",
    asideDescription: "Identity, policy, and reveal flow stay aligned.",
    submitLabel: "Enter workspace",
    pendingLabel: "Signing in...",
    switchLead: "New to Hermit?",
    switchAction: "Create account",
    formNote: "Secret and vault prompts happen at reveal time.",
    introTitle: "Returning operator",
    introBody: "Use your workspace credentials.",
    checklist: [
      "Restores workspace context.",
      "Returns to protected flows.",
      "Keeps audit continuity.",
    ],
  },
  signup: {
    eyebrow: "Create Workspace Access",
    title: "Create your operator account",
    description: "Create an identity, then create your workspace.",
    asideTitle: "Start clean.",
    asideDescription: "Account first. Organization next.",
    submitLabel: "Create account",
    pendingLabel: "Creating account...",
    switchLead: "Already have credentials?",
    switchAction: "Sign in instead",
    formNote: "After sign-up, you go straight to organization setup.",
    introTitle: "First-time setup",
    introBody: "This identity owns or joins workspaces.",
    checklist: [
      "Create your identity.",
      "Name your first organization.",
      "Invite teammates later.",
    ],
  },
} satisfies Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    asideTitle: string;
    asideDescription: string;
    submitLabel: string;
    pendingLabel: string;
    switchLead: string;
    switchAction: string;
    formNote: string;
    introTitle: string;
    introBody: string;
    checklist: string[];
  }
>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");

  const { mutate: login, isPending: isLoggingIn } = useLogin();
  const { mutate: register, isPending: isRegistering } = useRegister();

  const isBusy = isLoggingIn || isRegistering;
  const isLogin = mode === "signin";
  const copy = modeCopy[mode];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      login(
        { email, password },
        {
          onSuccess: () => router.push(returnUrl || "/dashboard"),
        },
      );
      return;
    }

    register(
      {
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
      },
      {
        onSuccess: () => router.push(returnUrl || "/onboarding"),
      },
    );
  };

  return (
    <AuthShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      asideTitle={copy.asideTitle}
      asideDescription={copy.asideDescription}
      features={[]}
      footerNote={copy.formNote}
    >
      <div className="space-y-7">
        <div className="grid gap-4 rounded-[24px] border border-black/5 bg-background/55 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {copy.introTitle}
            </p>
            <div className="shrink-0 whitespace-nowrap rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {isLogin ? "Return Flow" : "Setup Flow"}
            </div>
          </div>

          <div className="inline-flex rounded-full border border-black/5 bg-background/80 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isLogin
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !isLogin
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>
        </div>

        {returnUrl ? (
          <div className="rounded-[22px] border border-primary/15 bg-primary/8 px-4 py-3 text-sm leading-6 text-primary">
            You&apos;ll return to the protected flow after sign-in.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="jane.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="operator@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs font-medium text-muted-foreground">
                {isLogin ? "Prompts come later." : "Use 8+ characters."}
              </span>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              placeholder={isLogin ? "Enter your password" : "Create a strong password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
              required
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl text-base font-medium shadow-none"
            disabled={isBusy}
          >
            {isBusy ? copy.pendingLabel : copy.submitLabel}
          </Button>
        </form>

        <div className="flex flex-col gap-3 border-t border-black/5 pt-5 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "signin")}
            className="inline-flex items-center gap-2 text-left font-medium text-primary transition-colors hover:text-primary/80"
          >
            <span>{copy.switchLead}</span>
            <span>{copy.switchAction}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">
            Return to overview
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading authentication flow...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
