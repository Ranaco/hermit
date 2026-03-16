"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Vault,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ShaderAnimation } from "@/components/ui/shader-lines";

const useCases = [
  {
    title: "Platform teams",
    body: "Secrets, credentials, and rotation policy in one auditable control plane.",
  },
  {
    title: "Security teams",
    body: "Custom IAM roles, deny rules, and team assignments instead of static RBAC.",
  },
  {
    title: "Developers",
    body: "Dashboard and CLI keep secrets out of source control and local files.",
  },
];

const features = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Organization hierarchy",
    body: "Vaults, keys, and secrets scoped to tenant boundaries you can audit and switch.",
  },
  {
    icon: <KeyRound className="h-5 w-5" />,
    title: "Transit-backed crypto",
    body: "HashiCorp Vault transit handles encryption, decryption, and key rotation.",
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Three-tier protection",
    body: "Auth, vault passwords, and secret passwords — each with a distinct purpose.",
  },
  {
    icon: <Fingerprint className="h-5 w-5" />,
    title: "Runtime IAM",
    body: "Policies checked against resource URNs in real time. No coarse role collapse.",
  },
];

const principles = [
  "Hierarchy is explicit. Organizations, vaults, keys, and secrets are visible at every level.",
  "Access is deliberate. Permissions and reveal flows explain themselves without friction.",
  "Built for trust. Controlled, legible, production-ready under pressure.",
];

export function LandingPage() {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background font-sans text-foreground selection:bg-primary/30">
      <ShaderAnimation />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_72%_62%_at_50%_0%,#000_68%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-6 rounded-full border border-white/10 bg-black/25 px-6 py-4 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-white/10">
              <Logo className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-foreground">Hermit</span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Secret Operations
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#use-cases" className="transition-colors hover:text-foreground">
              Use Cases
            </Link>
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#about" className="transition-colors hover:text-foreground">
              About
            </Link>
          </nav>

          <Link
            href="/login"
            className="hidden h-10 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-transform hover:scale-[1.03] md:inline-flex"
          >
            Enter Workspace
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </header>

        <main className="flex-1">
          <section className="flex flex-col items-center px-2 pb-16 pt-24 text-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md">
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              Multi-tenant KMS with policy-aware operations
            </div>

            <h1 className="mt-8 max-w-5xl bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-5xl font-bold leading-[1.04] tracking-tight text-transparent md:text-7xl">
              Turn Secrets
              <br />
              Into Security.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Key rotation, access policy, and secret protection — one control plane.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background shadow-[0_0_30px_-5px_var(--color-primary)] ring-1 ring-foreground/20 transition-all hover:scale-105 hover:shadow-[0_0_45px_-5px_var(--color-primary)]"
              >
                Get Started
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-base font-medium text-foreground backdrop-blur-md transition-all hover:scale-105 hover:bg-white/10"
              >
                See It in Action
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="mt-24 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
              {[
                { label: "Protection", value: "3-tier" },
                { label: "Policy model", value: "URN IAM" },
                { label: "Operator surfaces", value: "Web + CLI" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5 text-left backdrop-blur-xl"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div id="demo" className="relative mt-20 w-full max-w-6xl">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[44%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-primary/40 blur-[120px]" />

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]/90 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl transition-transform duration-500 hover:scale-[1.01]">
                <div className="flex h-12 items-center border-b border-white/5 bg-[#0a101c] px-4">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-white/20" />
                    <div className="h-3 w-3 rounded-full bg-white/20" />
                    <div className="h-3 w-3 rounded-full bg-white/20" />
                  </div>
                  <div className="mx-auto flex h-6 w-64 items-center justify-center rounded bg-white/5 text-xs text-white/40">
                    hermit.com/dashboard
                  </div>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
                  <div className="space-y-4">
                    {[
                      {
                        icon: <Building2 className="h-5 w-5" />,
                        label: "Organization",
                        title: "Acme Security",
                        detail: "Roles, teams, and invite flow.",
                      },
                      {
                        icon: <Vault className="h-5 w-5" />,
                        label: "Vault",
                        title: "Production Vault",
                        detail: "Credentials and secrets, isolated by partition.",
                      },
                      {
                        icon: <KeyRound className="h-5 w-5" />,
                        label: "Key",
                        title: "payments-master-key",
                        detail: "Transit-backed with auditable rotation.",
                      },
                      {
                        icon: <Lock className="h-5 w-5" />,
                        label: "Secret",
                        title: "STRIPE_API_KEY",
                        detail: "Password-protected with audit on reveal.",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[24px] border border-white/8 bg-white/[0.04] px-5 py-4 text-left backdrop-blur-xl"
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-primary">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                              {item.label}
                            </p>
                            <p className="mt-1.5 text-lg font-bold tracking-tight text-white">
                              {item.title}
                            </p>
                            <p className="mt-1.5 text-sm leading-6 text-white/60">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-5 py-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                        Policy engine
                      </p>
                      <div className="mt-4 space-y-3">
                        {[
                          "organizations:read",
                          "vaults:create",
                          "keys:use",
                          "secrets:use",
                        ].map((action) => (
                          <div
                            key={action}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3"
                          >
                            <span className="font-mono text-sm text-white/76">{action}</span>
                            <span className="rounded-full bg-emerald-400/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                              Allow
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-5 py-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                          Audit flow
                        </p>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/34">
                          Last 24h
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          "Secret revealed with vault password",
                          "Transit key rotated",
                          "Invite accepted",
                        ].map((event) => (
                          <div key={event} className="flex gap-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                            <p className="text-sm leading-6 text-white/62">{event}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a101c] to-transparent" />
              </div>
            </div>
          </section>

          <section id="use-cases" className="scroll-mt-28 pt-8">
            <div className="max-w-[720px]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Use Cases
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-foreground">
                Structure under pressure.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Explicit, reviewable secret handling for fast-moving teams.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {useCases.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
                >
                  <p className="text-2xl font-black tracking-tight text-foreground">{item.title}</p>
                  <p className="mt-4 text-[15px] leading-7 text-muted-foreground">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="features" className="scroll-mt-28 pt-18">
            <div className="grid gap-10 lg:grid-cols-[0.88fr_minmax(0,1.12fr)]">
              <div className="max-w-[560px]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Features
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-foreground">
                  Security in the workflow.
                </h2>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  The interface follows the system model — no shortcuts hiding the security layer.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {features.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      {item.icon}
                    </div>
                    <p className="mt-5 text-xl font-black tracking-tight text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="about" className="scroll-mt-28 pt-18">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="max-w-[680px]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  About
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-foreground">
                  Mirror the system, not obscure it.
                </h2>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {principles.map((principle, index) => (
                  <div
                    key={principle}
                    className="rounded-[28px] border border-white/8 bg-slate-950/28 px-5 py-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/34">
                      Principle {index + 1}
                    </p>
                    <p className="mt-3 text-[15px] leading-7 text-white/68">{principle}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
                  Dashboard first, CLI when you need it.
                </p>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
                >
                  Enter Hermit
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
