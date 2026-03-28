"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Fingerprint,
  Lock,
  Moon,
  ScanSearch,
  ShieldCheck,
  Sun,
  Waypoints,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/ui/logo";
import { AmbientParallax } from "@/components/ambient-parallax";
import { ScrollParallaxBlock } from "@/components/scroll-parallax-block";

const navigation = [
  { label: "Routing", href: "#routing" },
  { label: "Custody", href: "#custody" },
  { label: "Workspace", href: "#workspace" },
  { label: "Docs", href: "/docs" },
];

const routeSteps = [
  {
    title: "Declare the boundary",
    body: "Organizations, vaults, keys, and secrets stay visible as real operational boundaries instead of collapsing into a vague workspace metaphor.",
  },
  {
    title: "Control the relay",
    body: "Access decisions, reveal prompts, and versioned updates move through deliberate checkpoints so teams can reason about who can do what.",
  },
  {
    title: "Leave a trail",
    body: "Invites, reveals, and changes remain legible because the interface treats chain-of-custody as part of the product, not a side panel.",
  },
];

const productSignals = [
  {
    title: "Policy relay",
    body: "Map dynamic IAM decisions to concrete resource scope, then show that scope clearly in the interface.",
    icon: Fingerprint,
  },
  {
    title: "Sealed reveal",
    body: "Layer authentication, vault passwords, and secret passwords without making the reveal flow feel arbitrary.",
    icon: Lock,
  },
  {
    title: "Transit backbone",
    body: "Keep encryption primitives tied to Vault transit while presenting a calmer operational surface to humans.",
    icon: ShieldCheck,
  },
  {
    title: "Operational graph",
    body: "Expose the relationship between orgs, vaults, keys, and audit so teams can inspect the system instead of guessing.",
    icon: Waypoints,
  },
];

const securityChecklist = [
  "Explicit deny precedence",
  "Versioned secret history",
  "Scoped reveal challenges",
  "Visible operational context",
];

function HeaderLink({ href, label }: { href: string; label: string }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("#")) {
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="text-sm text-[#181410]/66 transition-colors duration-300 hover:text-[#181410] dark:text-[#f0e7dc]/68 dark:hover:text-[#fff8f0]"
    >
      {label}
    </Link>
  );
}

export function LandingPage() {
  const [headerHidden, setHeaderHidden] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    let previousScrollY = window.scrollY;
    const updateHeader = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 24) {
        setHeaderHidden(false);
      } else if (currentScrollY > previousScrollY) {
        setHeaderHidden(true);
      } else if (currentScrollY < previousScrollY) {
        setHeaderHidden(false);
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateHeader);
    };
  }, []);

  return (
    <div className="hermit-copy min-h-screen overflow-x-hidden bg-[#f6f1eb] text-[#181410] selection:bg-[#b07a3f]/20 dark:bg-[#0f0c0a] dark:text-[#f3ede6]">
      <div className="relative isolate overflow-x-hidden">
        <AmbientParallax
          layers={[
            {
              className:
                "left-[-2%] top-[8rem] h-20 w-20 rounded-[24px] border border-black/5 bg-[linear-gradient(180deg,rgba(176,122,63,0.06),rgba(255,255,255,0.18))] dark:border-white/7 dark:bg-[linear-gradient(180deg,rgba(170,112,54,0.08),rgba(255,255,255,0.015))]",
              depth: 0.42,
              travel: 18,
            },
            {
              className:
                "right-[-4%] top-[10rem] h-12 w-28 rounded-full border border-black/5 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(191,120,58,0.08),rgba(255,255,255,0.06))] dark:border-white/7 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.03),rgba(191,120,58,0.1),rgba(255,255,255,0.02))]",
              depth: 0.58,
              travel: 18,
            },
            {
              className:
                "right-[8%] bottom-[16%] h-14 w-14 rounded-full border border-black/5 bg-[radial-gradient(circle,rgba(168,112,64,0.1),rgba(255,255,255,0.14))] dark:border-white/7 dark:bg-[radial-gradient(circle,rgba(168,112,64,0.08),rgba(255,255,255,0.02))]",
              depth: 0.32,
              travel: 14,
            },
            {
              className:
                "left-[2%] top-[38rem] h-10 w-28 rounded-full border border-black/5 bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(220,145,72,0.08),rgba(255,255,255,0.07))] dark:border-white/7 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.018),rgba(220,145,72,0.08),rgba(255,255,255,0.018))]",
              depth: 0.54,
              travel: 16,
            },
            {
              className:
                "right-[-3%] top-[58rem] h-20 w-20 rounded-[26px] border border-black/5 bg-[radial-gradient(circle_at_30%_30%,rgba(156,99,43,0.1),rgba(255,255,255,0.14))] dark:border-white/7 dark:bg-[radial-gradient(circle_at_30%_30%,rgba(156,99,43,0.08),rgba(255,255,255,0.016))]",
              depth: 0.62,
              travel: 16,
            },
          ]}
        />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(173,113,56,0.08),transparent_18%),radial-gradient(circle_at_82%_12%,rgba(217,152,74,0.05),transparent_16%),linear-gradient(90deg,rgba(17,12,10,0.04)_1px,transparent_1px),linear-gradient(rgba(17,12,10,0.03)_1px,transparent_1px)] bg-[size:auto,auto,128px_128px,128px_128px] opacity-38 dark:bg-[radial-gradient(circle_at_top_left,rgba(173,113,56,0.1),transparent_20%),radial-gradient(circle_at_82%_12%,rgba(217,152,74,0.05),transparent_18%),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_38%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,232,205,0.04),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[18rem] bg-[linear-gradient(180deg,transparent,rgba(246,241,235,0.9))] dark:bg-[linear-gradient(180deg,transparent,rgba(10,6,10,0.48))]" />

        <header
          className={`fixed inset-x-0 top-0 z-50 px-4 pt-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-6 lg:px-8 ${headerHidden ? "-translate-y-[calc(100%+1rem)]" : "translate-y-0"}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(246,241,235,0.78),rgba(246,241,235,0.22),transparent)] transition-opacity duration-500 dark:bg-[linear-gradient(180deg,rgba(16,13,10,0.74),rgba(16,13,10,0.2),transparent)]" />
          <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-black/8 bg-white/58 px-4 py-3 shadow-[0_18px_36px_-34px_rgba(39,28,17,0.16)] backdrop-blur-md dark:border-white/8 dark:bg-white/[0.03] dark:shadow-[0_20px_54px_-45px_rgba(0,0,0,0.62)] sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.05]">
                <Logo className="h-6 w-6 text-[#1a1511] dark:text-[#fff4ea]" />
              </div>
              <div className="leading-none">
                <p className="hermit-display text-base font-semibold tracking-[-0.04em] text-[#181410] dark:text-[#fff4ea]">Hermit</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#181410]/36 dark:text-[#f2e9df]/38">sealed relay</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              {navigation.map((item) => (
                <HeaderLink key={item.label} href={item.href} label={item.label} />
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-[#181410]/72 transition-colors hover:bg-black/[0.05] hover:text-[#181410] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#f2e9df]/72 dark:hover:bg-white/[0.06] dark:hover:text-[#fff8f0]"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link
                href="/login"
                className="hidden rounded-full border border-black/8 px-4 py-2 text-sm text-[#181410]/72 transition-colors hover:bg-black/[0.04] hover:text-[#181410] dark:border-white/10 dark:text-[#f2e9df]/68 dark:hover:bg-white/[0.05] dark:hover:text-[#fff8f0] md:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#181410] px-4 py-2 text-sm font-medium text-[#f8f2ea] shadow-[0_14px_28px_-24px_rgba(24,20,16,0.5)] transition-transform duration-300 hover:-translate-y-px dark:bg-[#b07a3f] dark:text-[#fff7ef] dark:shadow-[0_14px_36px_-24px_rgba(176,122,63,0.9)]"
              >
                Open Hermit
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 snap-y snap-mandatory">
          <ScrollParallaxBlock active speed={16}>
            <section className="relative flex min-h-[calc(100svh-6.5rem)] snap-start items-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
              <div className="pointer-events-none absolute left-[8%] top-[15%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(177,117,58,0.12),transparent_68%)] blur-3xl hermit-breathe dark:bg-[radial-gradient(circle,rgba(177,117,58,0.14),transparent_68%)]" />
              <div className="pointer-events-none absolute right-[10%] top-[20%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(214,150,77,0.08),transparent_72%)] blur-3xl hermit-breathe dark:bg-[radial-gradient(circle,rgba(214,150,77,0.08),transparent_72%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <p className="hermit-display text-[clamp(7rem,24vw,22rem)] font-semibold leading-none tracking-[-0.08em] text-[#181410]/[0.05] dark:text-white/[0.04]">
                  HERMIT
                </p>
              </div>
              <div className="mx-auto flex w-full max-w-5xl justify-center">
                <div className="relative flex w-full max-w-4xl flex-col items-center text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#181410]/48 hermit-hero-stage hermit-delay-1 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f0dcc8]/58">
                    <ScanSearch className="h-3.5 w-3.5" />
                    Hermit secret relay
                  </div>

                  <h1 className="hermit-display mt-6 max-w-[12ch] text-[clamp(3.6rem,7.8vw,7.1rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-[#181410] hermit-hero-stage hermit-delay-2 dark:text-[#fff7f0]">
                    Control every secret without losing the trail.
                  </h1>

                  <p className="mt-5 max-w-[42rem] text-[clamp(1rem,1.42vw,1.07rem)] font-medium leading-7 tracking-[-0.01em] text-[#181410]/62 hermit-hero-stage hermit-delay-3 dark:text-[#f2e3d2]/60">
                    Hermit gives security teams one restrained surface for policy-aware access, explicit reveal paths, and audit continuity across real operational work.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row hermit-hero-stage hermit-delay-4">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#181410] px-6 py-3 text-sm font-medium text-[#f8f2ea] shadow-[0_16px_30px_-22px_rgba(24,20,16,0.35)] transition-transform duration-300 hover:-translate-y-px dark:bg-[#b07a3f] dark:text-[#fff7ef] dark:shadow-[0_16px_40px_-22px_rgba(176,122,63,0.85)]"
                    >
                      Enter workspace
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="#routing"
                      onClick={(event) => {
                        event.preventDefault();
                        document.querySelector("#routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        window.history.replaceState(null, "", "#routing");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/8 bg-white/55 px-6 py-3 text-sm text-[#181410]/76 transition-colors hover:bg-white/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#fff2e8]/82 dark:hover:bg-white/[0.06]"
                    >
                      Review the model
                    </Link>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-black/8 pt-4 text-[11px] uppercase tracking-[0.24em] text-[#181410]/42 hermit-hero-stage hermit-delay-5 dark:border-white/10 dark:text-[#f0dcc8]/44">
                    <span>Policy-aware routing</span>
                    <span className="hidden h-1 w-1 rounded-full bg-black/20 dark:bg-white/20 sm:block" />
                    <span>Vault-backed custody</span>
                    <span className="hidden h-1 w-1 rounded-full bg-black/20 dark:bg-white/20 sm:block" />
                    <span>Audit-ready reveal path</span>
                  </div>
                </div>
              </div>
            </section>
          </ScrollParallaxBlock>

          <ScrollParallaxBlock active speed={22}>
            <section id="routing" className="relative z-20 flex min-h-[100svh] snap-start items-center overflow-hidden border-t border-black/8 px-4 py-24 dark:border-white/10 sm:px-6 lg:px-8">
            <ScrollParallaxBlock active followCursor cursorTravel={18} speed={40} className="pointer-events-none absolute left-[8%] top-20 hidden lg:block">
              <div className="h-40 w-14 rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(179,116,56,0.18),rgba(255,255,255,0.03))]" />
            </ScrollParallaxBlock>
            <ScrollParallaxBlock active followCursor cursorTravel={20} speed={56} className="pointer-events-none absolute right-[6%] top-32 hidden lg:block">
              <div className="h-24 w-32 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(214,150,77,0.16),rgba(255,255,255,0.02))]" />
            </ScrollParallaxBlock>
            <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div className="self-start lg:sticky lg:top-28">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#181410]/38 dark:text-[#f0dcc8]/36">Routing model</p>
                  <h2 className="hermit-display mt-4 max-w-[10ch] text-[clamp(2.7rem,5vw,5rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#181410] dark:text-[#fff7f0]">
                    Hermit is about controlled passage.
                  </h2>
                  <p className="mt-5 max-w-[34ch] text-[15px] leading-8 text-[#181410]/62 dark:text-[#f2e3d2]/60">
                    A professional secret system should not feel like a pile of forms. It should feel like a route map
                    with explicit boundaries and clear checkpoints.
                  </p>
                </div>
              </div>

              <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
                {productSignals.map((signal, index) => {
                  const Icon = signal.icon;

                  return (
                    <article key={signal.title} className={`border-b border-black/8 pb-8 dark:border-white/10 ${index > 1 ? "md:pb-0" : ""}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-[#8f5d2a] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#cf9252]">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="hermit-display mt-5 text-[1.8rem] font-semibold tracking-[-0.04em] text-[#181410] dark:text-[#fff7f0]">{signal.title}</h3>
                      <p className="mt-3 max-w-[28ch] text-[15px] leading-7 text-[#181410]/62 dark:text-[#f2e3d2]/60">{signal.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
            </section>
          </ScrollParallaxBlock>

          <ScrollParallaxBlock active speed={26}>
            <section id="custody" className="relative z-30 flex min-h-[100svh] snap-start items-center overflow-hidden border-t border-black/8 px-4 py-24 dark:border-white/10 sm:px-6 lg:px-8">
            <ScrollParallaxBlock active followCursor cursorTravel={18} speed={58} className="pointer-events-none absolute left-[14%] top-24 hidden lg:block">
              <div className="h-16 w-44 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(181,117,57,0.16),rgba(255,255,255,0.02))]" />
            </ScrollParallaxBlock>
            <ScrollParallaxBlock active followCursor cursorTravel={16} speed={42} className="pointer-events-none absolute right-[8%] bottom-10 hidden lg:block">
              <div className="h-24 w-24 rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_30%_30%,rgba(213,147,74,0.16),rgba(255,255,255,0.02))]" />
            </ScrollParallaxBlock>
            <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
              <div className="max-w-2xl self-start lg:sticky lg:top-28">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#181410]/38 dark:text-[#f0dcc8]/36">Custody flow</p>
                  <h2 className="hermit-display mt-4 text-[clamp(2.6rem,4.8vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#181410] dark:text-[#fff7f0]">
                    Every action should feel accountable.
                  </h2>
                  <p className="mt-5 max-w-[34ch] text-[15px] leading-8 text-[#181410]/62 dark:text-[#f2e3d2]/60">
                    Each reveal, handoff, and update should pass a visible checkpoint instead of disappearing into
                    generic admin chrome.
                  </p>
                </div>
              </div>

              <div className="space-y-10">
                {routeSteps.map((step, index) => (
                  <article key={step.title} className="grid gap-5 border-b border-black/8 pb-8 last:border-b-0 last:pb-0 dark:border-white/10 md:grid-cols-[4rem_1fr]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#181410]/34 dark:text-[#f0dcc8]/34">0{index + 1}</div>
                    <div>
                      <h3 className="hermit-display text-[1.95rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[#181410] dark:text-[#fff7f0]">
                        {step.title}
                      </h3>
                      <p className="mt-4 max-w-[42ch] text-[15px] leading-8 text-[#181410]/62 dark:text-[#f2e3d2]/60">{step.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            </section>
          </ScrollParallaxBlock>

          <ScrollParallaxBlock active speed={22}>
            <section id="workspace" className="relative z-40 flex min-h-[100svh] snap-start items-center overflow-hidden border-t border-black/8 px-4 py-24 dark:border-white/10 sm:px-6 lg:px-8">
            <ScrollParallaxBlock active followCursor cursorTravel={18} speed={50} className="pointer-events-none absolute right-[12%] top-20 hidden lg:block">
              <div className="h-32 w-10 rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(181,117,57,0.16),rgba(255,255,255,0.03))]" />
            </ScrollParallaxBlock>
            <ScrollParallaxBlock active followCursor cursorTravel={22} speed={66} className="pointer-events-none absolute left-[6%] bottom-10 hidden lg:block">
              <div className="h-20 w-36 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(213,147,74,0.16),rgba(255,255,255,0.02))]" />
            </ScrollParallaxBlock>
            <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
              <div className="self-start lg:sticky lg:top-28">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#181410]/38 dark:text-[#f0dcc8]/38">Workspace feel</p>
                  <h2 className="hermit-display mt-4 max-w-[11ch] text-[clamp(2.5rem,4.8vw,4.15rem)] font-semibold leading-[1] tracking-[-0.05em] text-[#181410] dark:text-[#fff7f0]">
                    Professional, but not sterile.
                  </h2>
                  <p className="mt-5 max-w-[42ch] text-[15px] leading-8 text-[#181410]/62 dark:text-[#f2e3d2]/60">
                    Hermit should feel like a premium operations desk: restrained, legible, and serious, with enough
                    character that users remember where they are.
                  </p>
                </div>
              </div>

              <div className="border-t border-black/8 pt-2 dark:border-white/10 lg:border-t-0 lg:border-l lg:pl-10">
                <div className="space-y-5">
                  {securityChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-4 border-b border-black/8 pb-5 last:border-b-0 last:pb-0 dark:border-white/10">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-[#8f5d2a] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#cf9252]">
                        <Check className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-7 text-[#181410]/64 dark:text-[#f2e3d2]/64">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </section>
          </ScrollParallaxBlock>
        </main>

        <ScrollParallaxBlock>
          <footer className="relative flex min-h-[100svh] snap-start items-center border-t border-black/8 px-4 pt-24 pb-0 dark:border-white/10 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
                  <Logo className="h-7 w-7 text-[#181410] dark:text-[#fff4ea]" />
                </div>
                <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-[#181410]/38 dark:text-[#f0dcc8]/38">Start now</p>
                <h2 className="hermit-display mt-4 max-w-[11ch] text-[clamp(3rem,5vw,6rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-[#181410] dark:text-[#fff7f0]">
                  Move sensitive work through a calmer system.
                </h2>
                <p className="mt-5 max-w-[36ch] text-[15px] leading-8 text-[#181410]/62 dark:text-[#f2e3d2]/60">
                  Hermit brings policy, hierarchy, reveal control, and audit into one professional surface that teams
                  can actually trust under real operating conditions.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#181410] px-6 py-3 text-sm font-medium text-[#f8f2ea] shadow-[0_16px_30px_-22px_rgba(24,20,16,0.35)] transition-transform duration-300 hover:-translate-y-px dark:bg-[#b07a3f] dark:text-[#fff7ef] dark:shadow-[0_16px_40px_-22px_rgba(176,122,63,0.85)]"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#routing"
                    onClick={(event) => {
                      event.preventDefault();
                      document.querySelector("#routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      window.history.replaceState(null, "", "#routing");
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white/55 px-6 py-3 text-sm text-[#181410]/76 transition-colors hover:bg-white/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#fff2e8]/82 dark:hover:bg-white/[0.06]"
                  >
                    Review routing
                  </Link>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#181410]/34 dark:text-[#f0dcc8]/34">Product</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <HeaderLink href="#routing" label="Routing" />
                    <HeaderLink href="#custody" label="Custody" />
                    <HeaderLink href="#workspace" label="Workspace" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#181410]/34 dark:text-[#f0dcc8]/34">Platform</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <HeaderLink href="/login" label="Dashboard" />
                    <HeaderLink href="/docs" label="Docs" />
                    <HeaderLink href="/invite" label="Invites" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#181410]/34 dark:text-[#f0dcc8]/34">Company</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <HeaderLink href="/" label="Home" />
                    <HeaderLink href="/login" label="Get started" />
                    <HeaderLink href="/dashboard" label="Workspace" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex min-h-[10rem] items-end overflow-hidden">
              <p className="hermit-display text-[clamp(5.5rem,24vw,22rem)] font-semibold leading-none tracking-[-0.1em] text-[#181410] dark:text-[#fff7f0]">
                Hermit
              </p>
            </div>
          </div>
          </footer>
        </ScrollParallaxBlock>
      </div>
    </div>
  );
}
