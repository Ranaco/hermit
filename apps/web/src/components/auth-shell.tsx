import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Home, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_minmax(0,0.85fr)]">
          <section className="hidden rounded-[30px] border border-border/70 bg-card/70 p-8 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.28)] lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-8">
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="inline-flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card">
                    <Logo className="h-4 w-4 text-foreground" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">Hermit</span>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Control Plane
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

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {eyebrow}
                  </div>
                <div className="space-y-2">
                  <h1 className="max-w-[16ch] text-[clamp(2.4rem,4vw,3.75rem)] font-semibold leading-[1.02] tracking-tight text-foreground">
                    {asideTitle}
                  </h1>
                  <p className="max-w-[46ch] text-sm leading-6 text-muted-foreground">
                    {asideDescription}
                  </p>
                </div>
              </div>

              {features.length > 0 ? (
                <div className="grid gap-4">
                  {features.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-4 rounded-[18px] border border-border/70 bg-background/70 p-4">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                        {feature.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-foreground">
                          {feature.title}
                        </p>
                        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                          {feature.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mb-1 flex items-center justify-between gap-4 border-t border-border/80 pt-6">
              <div>
                <p className="text-sm font-medium text-foreground">Built for operators</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Secrets, policy, audit.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                Ready
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-[540px]">
              <div className="border-b border-border pb-6 lg:hidden">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <Link href="/" className="inline-flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card">
                      <Logo className="h-4 w-4 text-foreground" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">Hermit</span>
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
                <div className="inline-flex items-center rounded-full border border-border/70 bg-card/75 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {eyebrow}
                </div>
                <h2 className="mt-4 text-[clamp(2rem,3vw,2.75rem)] font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
                <p className="mt-3 max-w-[46ch] text-[15px] leading-7 text-muted-foreground">
                  {description}
                </p>
              </div>

              <div className="mt-8 rounded-[28px] border border-border/70 bg-card/72 p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.28)] sm:p-6">
                {children}
              </div>

              {footerNote ? (
                <div className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
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
