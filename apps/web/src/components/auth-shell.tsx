import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Home, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { AmbientParallax } from "@/components/ambient-parallax";

interface AuthShellFeature {
  icon: ReactNode;
  title: string;
  detail: string;
}

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  asideTitle: string;
  asideDescription: string;
  features: AuthShellFeature[];
  footerNote?: string;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  asideTitle,
  asideDescription,
  features,
  footerNote,
}: AuthShellProps) {
  return (
    <div className="hermit-shell min-h-screen bg-background text-foreground">
      <AmbientParallax
        layers={[
          {
            className:
              "left-[6%] top-[14%] h-20 w-20 rounded-[26px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]",
            depth: 0.26,
            travel: 12,
          },
          {
            className:
              "right-[8%] top-[22%] h-12 w-28 rounded-full border border-border/60 bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(123,166,162,0.16),rgba(255,255,255,0.05))]",
            depth: 0.38,
            travel: 14,
          },
        ]}
      />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1220px] items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.02fr_minmax(0,0.88fr)]">
          <section className="hermit-panel hidden min-h-[720px] overflow-hidden hermit-enter-soft lg:flex lg:flex-col lg:justify-between">
            <div className="relative p-8">
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="inline-flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card/80">
                    <Logo className="h-5 w-5 text-foreground" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">Hermit</span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      sealed relay
                    </span>
                  </span>
                </Link>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Home className="h-4 w-4" />
                  Back Home
                </Link>
              </div>

              <div className="mt-16 max-w-[32rem]">
                <div className="hermit-kicker">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {eyebrow}
                </div>
                <h1 className="mt-5 max-w-[12ch] text-[clamp(2.8rem,4vw,4.3rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-foreground">
                  {asideTitle}
                </h1>
                <p className="mt-4 max-w-[42ch] text-[15px] leading-8 text-muted-foreground">
                  {asideDescription}
                </p>
              </div>

              <div className="mt-10 grid gap-4">
                {features.length > 0 ? (
                  features.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-[22px] border border-border/80 bg-background/65 px-5 py-4 shadow-[0_18px_50px_-38px_rgba(39,28,17,0.24)] hermit-enter-soft"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/55 text-primary">
                          {feature.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold tracking-tight text-foreground">{feature.title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-border/80 bg-background/62 px-6 py-6 hermit-shimmer">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Relay note</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Your account is the operator identity. Workspace boundaries and reveal rules come after this step.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/80 bg-background/38 px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Built for accountable operations</p>
                  <p className="mt-1 text-sm text-muted-foreground">Secrets, policy, routing, audit.</p>
                </div>
                <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-[560px]">
              <div className="border-b border-border/80 pb-6 lg:hidden">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <Link href="/" className="inline-flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card/80">
                      <Logo className="h-4 w-4 text-foreground" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">Hermit</span>
                      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">sealed relay</span>
                    </span>
                  </Link>
                  <Link
                    href="/"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Back Home
                  </Link>
                </div>
              </div>

              <div className="pt-6 lg:pt-0">
                <div className="hermit-kicker">{eyebrow}</div>
                <h2 className="mt-5 text-[clamp(2.15rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-foreground">
                  {title}
                </h2>
                <p className="mt-3 max-w-[46ch] text-[15px] leading-7 text-muted-foreground">{description}</p>
              </div>

              <div className="hermit-panel hermit-enter mt-8 p-5 sm:p-6">{children}</div>

              {footerNote ? (
                <div className="mt-6 border-t border-border/80 pt-4 text-sm leading-6 text-muted-foreground">
                  {footerNote}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
