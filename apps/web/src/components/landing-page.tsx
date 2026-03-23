"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldCheck,
  TerminalSquare,
  Waypoints,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

const navigation = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Security", href: "#security" },
  { label: "Docs", href: "/docs" },
];

const platformFeatures = [
  {
    title: "Policy-aware access",
    body: "Evaluate custom IAM policy against resource URNs at the moment a user tries to read, reveal, rotate, or manage.",
    icon: <Fingerprint className="h-4 w-4" />,
  },
  {
    title: "Transit-backed protection",
    body: "Keep key operations and secret encryption wired through HashiCorp Vault transit instead of application-local shortcuts.",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    title: "Three-tier reveal control",
    body: "Authentication, vault passwords, and secret passwords protect different actions without flattening everything into one prompt.",
    icon: <Lock className="h-4 w-4" />,
  },
  {
    title: "Operator tooling",
    body: "Use the web dashboard, official CLI enrollment, invite flows, and one-time shares without losing audit continuity.",
    icon: <TerminalSquare className="h-4 w-4" />,
  },
];

const workflowItems = [
  {
    title: "Model the workspace the way it actually exists",
    body: "Organizations own vaults. Vaults own keys, groups, and secrets. The hierarchy stays visible in the UI, policy layer, and reveal path.",
  },
  {
    title: "Grant access with real scope",
    body: "Create custom roles, attach policies, assign teams, and scope access to the workspace, a vault, a folder subtree, or specific secrets.",
  },
  {
    title: "Operate without ambiguity",
    body: "Audit logs, reveal prompts, invite return URLs, and secret sharing are all first-class product workflows rather than side features.",
  },
];

const securityPoints = [
  "Custom roles and deny precedence instead of static RBAC",
  "Versioned secrets with auditable reveal operations",
  "Vault and secret password challenge flows",
  "CLI and dashboard surfaces that preserve control",
];

const sdkPills = [
  "Node.js",
  "Next.js",
  "Express",
  "CLI",
  "REST",
  "Vault",
  "PostgreSQL",
  "Prisma",
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-white/60 transition-colors hover:text-white">
      {label}
    </Link>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-white/68 transition-colors hover:text-white">
      {label}
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/15">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_18%),radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_24%),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:auto,auto,52px_52px,52px_52px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_42%)]" />

        <header className="relative z-20 px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl sm:px-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Logo className="h-6 w-6 text-white" />
              </div>
              <div className="leading-none">
                <p className="text-sm font-semibold tracking-[-0.02em]">Hermit</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/38">secret operations</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 md:flex">
              {navigation.map((item) => (
                <NavLink key={item.label} href={item.href} label={item.label} />
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white md:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-transform duration-300 hover:-translate-y-0.5"
              >
                Get started
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          <section className="px-4 pb-18 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-white/56">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Multi-tenant kms and secret operations
                </div>

                <h1 className="mt-8 text-[clamp(3.7rem,9vw,7.5rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-white">
                  Secrets for
                  <br />
                  modern teams
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-[clamp(1.05rem,1.8vw,1.22rem)] leading-8 text-white/62">
                  The cleanest way to manage vaults, keys, policies, reveal flows, invites, and audit logs without
                  hiding the security model underneath.
                </p>

                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    Start building
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Explore the product
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-14 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-white/38">sdk example</span>
                  </div>

                  <div className="grid gap-8 px-5 py-6 lg:grid-cols-[16rem_1fr]">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">integrate</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {sdkPills.map((pill) => (
                          <span
                            key={pill}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/74"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-sm leading-7 text-white/80">
                      <code>{`const hermit = new Hermit({
  baseUrl: process.env.HERMIT_URL,
  token: process.env.HERMIT_TOKEN,
});

await hermit.secrets.create({
  vaultId: "production-vault",
  keyId: "payments-master-key",
  name: "STRIPE_API_KEY",
  value: process.env.STRIPE_API_KEY,
});`}</code>
                    </pre>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-white/38">dashboard preview</span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                      healthy
                    </span>
                  </div>

                  <div className="space-y-4 px-5 py-6">
                    {[
                      { label: "Organization", value: "Acme Security" },
                      { label: "Vault", value: "Production Vault" },
                      { label: "Key", value: "payments-master-key" },
                      { label: "Secret", value: "STRIPE_API_KEY" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                      >
                        <span className="text-[11px] uppercase tracking-[0.22em] text-white/42">{row.label}</span>
                        <span className="text-sm font-medium text-white/86">{row.value}</span>
                      </div>
                    ))}

                    <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.22em] text-white/38">Policy evaluation</span>
                        <Waypoints className="h-4 w-4 text-white/46" />
                      </div>
                      <div className="mt-4 space-y-2.5">
                        {["vaults:create", "keys:use", "secrets:use"].map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3"
                          >
                            <span className="font-mono text-xs text-white/76">{item}</span>
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/46">Allow</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] px-6 py-5">
                <p className="text-center text-sm text-white/42">
                  Built for teams that want explicit hierarchy, audited reveals, custom IAM, CLI workflows, and
                  first-class operator tooling.
                </p>
              </div>
            </div>
          </section>

          <section id="features" className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Features</p>
                <h2 className="mt-4 text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-white">
                  A cleaner control plane
                  <br />
                  for secret operations
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-white/58">
                  Every part of the surface is meant to reduce ambiguity: what you can access, what is protected,
                  and how secrets move through the system.
                </p>
              </div>

              <div className="mt-12 grid gap-5 md:grid-cols-2">
                {platformFeatures.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.9)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/76">
                      {feature.icon}
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">{feature.title}</h3>
                    <p className="mt-3 max-w-[36ch] text-[15px] leading-7 text-white/58">{feature.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="workflow" className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[18rem_1fr] lg:gap-16">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Workflow</p>
                <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.07em] text-white">
                  Built for
                  <br />
                  operational clarity
                </h2>
              </div>

              <div className="space-y-0">
                {workflowItems.map((item, index) => (
                  <article key={item.title} className="grid gap-5 border-b border-white/10 py-8 md:grid-cols-[4rem_1fr]">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/34">0{index + 1}</div>
                    <div>
                      <h3 className="text-[1.8rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                        {item.title}
                      </h3>
                      <p className="mt-4 max-w-[44ch] text-[15px] leading-8 text-white/58">{item.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="security" className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-7">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Security posture</p>
                <h2 className="mt-4 max-w-[12ch] text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[0.98] tracking-[-0.07em] text-white">
                  Everything in your control
                </h2>
                <p className="mt-5 max-w-[42ch] text-[15px] leading-8 text-white/58">
                  Manage access, protection, reveal behavior, and audit visibility without relying on vague
                  workspace abstractions.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/40 p-7">
                <div className="space-y-4">
                  {securityPoints.map((point) => (
                    <div key={point} className="flex gap-3 border-b border-white/8 pb-4 last:border-b-0 last:pb-0">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-white/72" />
                      <p className="text-sm leading-7 text-white/62">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-12 border-t border-white/10 bg-[linear-gradient(180deg,#0b0b0d_0%,#11131a_100%)] px-4 pb-0 pt-10 sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto max-w-7xl overflow-hidden min-h-[40rem] lg:min-h-[46rem]">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1.3fr] lg:gap-16">
              <div className="space-y-8">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Logo className="h-7 w-7 text-white" />
                  </div>
                  <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-white/38">Start now</p>
                  <h2 className="mt-4 max-w-[11ch] text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-white">
                    Operate secrets with less friction
                  </h2>
                </div>

                <div className="space-y-5">
                  <p className="max-w-[34ch] text-[15px] leading-8 text-white/58">
                    Hermit brings policy, hierarchy, reveal control, and audit together in a product surface that
                    developers and operators can actually reason about.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      Get started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="#features"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/78 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-10 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/36">Product</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <FooterLink href="#features" label="Features" />
                    <FooterLink href="#workflow" label="Workflow" />
                    <FooterLink href="#security" label="Security" />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/36">Platform</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <FooterLink href="/login" label="Dashboard" />
                    <FooterLink href="/docs" label="Docs" />
                    <FooterLink href="/invite" label="Invites" />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/36">Company</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <FooterLink href="/" label="Home" />
                    <FooterLink href="/login" label="Get Started" />
                    <FooterLink href="/dashboard" label="Workspace" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex min-h-[11rem] items-end pt-0 lg:min-h-[15rem]">
              <p className="text-center text-[clamp(7rem,29vw,26rem)] font-semibold leading-none tracking-[-0.05em] text-white/95">
                Hermit
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
