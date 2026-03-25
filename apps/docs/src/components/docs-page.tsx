import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DocsShell } from "@/components/docs-shell";
import { getChildPages, getNextPage, getPrevPage, type DocPageMeta } from "@/lib/docs";

function Hero({
  page,
  compact = false,
  children,
}: {
  page: DocPageMeta;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className={`docs-hero ${compact ? "docs-hero--compact" : ""}`}>
      <p className="docs-kicker">{page.eyebrow}</p>
      <h1 className="docs-page-title">{page.title}</h1>
      <p className="docs-page-description">{page.description}</p>
      {children}
    </header>
  );
}

function ChildLinks({ page }: { page: DocPageMeta }) {
  const children = getChildPages(page);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 grid gap-3 md:grid-cols-3">
      {children.map((child) => (
        <Link
          key={child.id}
          href={child.href}
          className="rounded-md border bg-[var(--docs-panel)] px-4 py-4 transition-colors hover:border-[var(--docs-border-strong)] hover:bg-[color:color-mix(in_oklab,var(--docs-panel)_72%,var(--docs-bg))]"
        >
          <p className="text-sm font-semibold text-[var(--docs-text)]">{child.title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--docs-muted)]">{child.description}</p>
        </Link>
      ))}
    </div>
  );
}

function Pager({ page }: { page: DocPageMeta }) {
  const prev = getPrevPage(page);
  const next = getNextPage(page);

  if (!prev && !next) {
    return null;
  }

  return (
    <nav className="mt-14 grid gap-3 border-t pt-6 md:grid-cols-2" style={{ borderColor: "var(--docs-border)" }}>
      {prev ? (
        <Link
          href={prev.href}
          className="rounded-md border bg-[var(--docs-panel)] px-4 py-4 transition-colors hover:border-[var(--docs-border-strong)]"
        >
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </p>
          <p className="mt-2 text-base font-semibold text-[var(--docs-text)]">{prev.title}</p>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={next.href}
          className="rounded-md border bg-[var(--docs-panel)] px-4 py-4 text-right transition-colors hover:border-[var(--docs-border-strong)]"
        >
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </p>
          <p className="mt-2 text-base font-semibold text-[var(--docs-text)]">{next.title}</p>
        </Link>
      ) : null}
    </nav>
  );
}

export function DocsHomePage({
  page,
  children,
}: {
  page: DocPageMeta;
  children: ReactNode;
}) {
  return (
    <DocsShell page={page}>
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </DocsShell>
  );
}

export function DocsSectionPage({
  page,
  children,
}: {
  page: DocPageMeta;
  children: ReactNode;
}) {
  return (
    <DocsShell page={page}>
      <div className="mx-auto max-w-[920px]">
        <Hero page={page} compact>
          <ChildLinks page={page} />
        </Hero>
        <article className="docs-prose mt-10">{children}</article>
      </div>
    </DocsShell>
  );
}

export function DocsArticlePage({
  page,
  children,
}: {
  page: DocPageMeta;
  children: ReactNode;
}) {
  return (
    <DocsShell page={page}>
      <div className="mx-auto max-w-[780px]">
        <Hero page={page} />
        <article className="docs-prose mt-10">{children}</article>
        <Pager page={page} />
      </div>
    </DocsShell>
  );
}
