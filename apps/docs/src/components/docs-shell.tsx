"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink, Github, Menu, MoonStar, Search, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DocsAmbientParallax } from "@/components/docs-ambient-parallax";
import { LogoMark } from "@/components/logo-mark";
import {
  docsPages,
  getChildPages,
  getDescendantPaths,
  normalizeDocHref,
  sidebarGroups,
  type DocPageMeta,
} from "@/lib/docs";

function DocsTree({
  pathname,
  currentPage,
}: {
  pathname: string;
  currentPage: DocPageMeta;
}) {
  return (
    <>
      {sidebarGroups.map((group) => (
        <section key={group.title} className="mt-8 first:mt-0">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--docs-soft)]">
            {group.title}
          </p>
          <nav className="space-y-1.5">
            {group.items.map((item) => {
              const selected = pathname === item.href;
              const descendants = getDescendantPaths(item);
              const expanded =
                selected ||
                descendants.includes(pathname) ||
                currentPage.parent === item.id;

              return (
                <div key={item.id}>
                  <Link
                    href={item.href}
                    className={`docs-nav-link flex items-center justify-between ${selected ? "docs-nav-link--active" : "docs-nav-link--idle"}`}
                  >
                    <span>{item.navLabel}</span>
                    {item.children?.length ? (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
                      />
                    ) : null}
                  </Link>

                  {expanded && item.children?.length ? (
                    <div className="mt-2 ml-3 border-l pl-3" style={{ borderColor: "var(--docs-border)" }}>
                      {getChildPages(item).map((child) => {
                        const childSelected = pathname === child.href;
                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={`mt-1 block rounded-xl px-3 py-2 text-sm transition-colors ${
                              childSelected
                                ? "bg-[var(--docs-panel)] text-[var(--docs-text)]"
                                : "text-[var(--docs-soft)] hover:bg-[var(--docs-panel)] hover:text-[var(--docs-text)]"
                            }`}
                          >
                            {child.navLabel}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </section>
      ))}
    </>
  );
}

export function DocsShell({
  page,
  children,
}: {
  page: DocPageMeta;
  children: ReactNode;
}) {
  const pathname = normalizeDocHref(usePathname());
  const showToc = page.kind === "article" && page.toc.length > 0;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  });

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("hermit-docs-theme", nextTheme);
    setTheme(nextTheme);
  }

  function openSearch() {
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }

      if (event.key === "Escape") {
        closeSearch();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = Object.values(docsPages)
    .flatMap((entry) => {
      const pageEntry = {
        key: entry.id,
        href: entry.href,
        title: entry.title,
        label: entry.eyebrow,
        description: entry.description,
      };

      const tocEntries = entry.toc.map((item) => ({
        key: `${entry.id}:${item.id}`,
        href: `${entry.href}#${item.id}`,
        title: item.label,
        label: entry.title,
        description: entry.description,
      }));

      return [pageEntry, ...tocEntries];
    })
    .filter((entry) => {
      if (!normalizedQuery) {
        return entry.key.indexOf(":") === -1;
      }

      const haystack = `${entry.title} ${entry.label} ${entry.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 9);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[var(--docs-bg)] text-[var(--docs-text)]">
      <DocsAmbientParallax />
      <header className="sticky top-0 z-40 border-b border-[var(--docs-border)] bg-[color:color-mix(in_oklab,var(--docs-bg)_82%,transparent)] px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-1 sm:px-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,28rem)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--docs-border)] bg-[var(--docs-panel)]">
                <LogoMark className="h-4.5 w-4.5 text-[var(--docs-accent)]" />
              </div>
              <span className="docs-display text-lg font-semibold tracking-[-0.04em] text-[var(--docs-text)]">Hermit</span>
            </Link>

            <nav className="hidden items-center gap-4 text-sm text-[var(--docs-muted)] lg:flex">
              <Link href="/" className="docs-top-link">
                Docs
              </Link>
              <Link href="/api/overview" className="docs-top-link">
                API
              </Link>
              <Link href="/cli/overview" className="docs-top-link">
                CLI
              </Link>
              <Link href="https://hermit.ranax.co" className="docs-top-link">
                Site
              </Link>
            </nav>
          </div>

          <button
            type="button"
            onClick={openSearch}
            className="hidden h-10 w-full items-center gap-3 rounded-xl border border-[var(--docs-border)] bg-[color:color-mix(in_oklab,var(--docs-panel)_92%,transparent)] px-3 text-left text-sm text-[var(--docs-muted)] transition-colors duration-300 hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)] lg:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Search documentation</span>
            <span className="rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em]">Ctrl K</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <Link
              href="https://github.com/ranaco/hermit"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--docs-border)] px-3 text-sm text-[var(--docs-muted)] transition-all duration-300 hover:-translate-y-px hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)]"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--docs-border)] text-[var(--docs-muted)] transition-all duration-300 hover:-translate-y-px hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)]"
            >
              {theme === "dark" ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <MoonStar className="h-4 w-4" />
              )}
            </button>
            <Link
              href="https://hermit.ranax.co/login"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--docs-border-strong)] bg-[color:color-mix(in_oklab,var(--docs-accent)_14%,var(--docs-panel))] px-3 text-sm text-[var(--docs-text)] transition-all duration-300 hover:-translate-y-px hover:bg-[color:color-mix(in_oklab,var(--docs-accent)_20%,var(--docs-panel))]"
            >
              App
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`relative z-10 mx-auto grid max-w-[1600px] gap-6 px-4 pt-6 sm:px-6 lg:px-8 ${
          showToc ? "lg:grid-cols-[18rem_minmax(0,1fr)_15rem]" : "lg:grid-cols-[18rem_minmax(0,1fr)]"
        }`}
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-6.5rem)] overflow-y-auto border-r border-[var(--docs-border)] pr-6 py-4">
            <DocsTree pathname={pathname} currentPage={page} />
          </div>
        </aside>

        <main className={`${showToc ? "lg:px-10" : "lg:px-12"} min-w-0 py-6 lg:py-10`}>
          <div className="mb-5 lg:hidden">
            <details className="docs-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-[var(--docs-muted)]">
                <span className="inline-flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Browse docs
                </span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="border-t border-[var(--docs-border)] px-4 py-4">
                <DocsTree pathname={pathname} currentPage={page} />
              </div>
            </details>
          </div>
          <div key={pathname} className="docs-route-stage">
            {children}
          </div>
        </main>

        {showToc ? (
          <aside className="hidden xl:block">
            <div className="sticky top-24 border-l border-[var(--docs-border)] pl-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--docs-soft)]">
                On this page
              </p>
              <nav className="mt-4 border-l pl-4" style={{ borderColor: "var(--docs-border)" }}>
                {page.toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block py-2 text-sm leading-6 text-[var(--docs-muted)] transition-colors hover:text-[var(--docs-text)]"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        ) : null}
      </div>

      <footer className="relative z-10 mt-6 border-t border-[var(--docs-border)]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-6 text-sm text-[var(--docs-soft)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>Hermit Docs. Built for operators working with secrets, policy, and transit-backed encryption.</p>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/ranaco/hermit" className="docs-top-link">
              GitHub
            </Link>
            <Link href="https://hermit.ranax.co" className="docs-top-link">
              Main site
            </Link>
          </div>
        </div>
      </footer>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(7,5,4,0.55)] px-4 pt-[12vh] backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="absolute inset-0"
          />

          <div className="relative z-10 w-full max-w-[42rem] rounded-[1.75rem] border border-[var(--docs-border-strong)] bg-[color:color-mix(in_oklab,var(--docs-bg)_92%,black)] p-4 shadow-[0_36px_120px_-48px_rgba(0,0,0,0.82)]">
            <div className="flex items-center gap-3 rounded-[1.1rem] border border-[var(--docs-border)] bg-[var(--docs-panel)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--docs-soft)]" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search pages, sections, and topics"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--docs-text)] outline-none placeholder:text-[var(--docs-soft)]"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="rounded-md border border-[var(--docs-border)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--docs-soft)] transition-colors hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)]"
              >
                Esc
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="docs-divider-list">
                  {searchResults.map((result) => (
                    <Link
                      key={result.key}
                      href={result.href}
                      onClick={closeSearch}
                      className="docs-link-row px-1"
                    >
                      <div className="flex items-center gap-3">
                        <p className="docs-display text-[1.1rem] font-semibold tracking-[-0.03em] text-[var(--docs-text)]">
                          {result.title}
                        </p>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--docs-soft)]">
                          {result.label}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-[var(--docs-muted)]">{result.description}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-1 py-8 text-sm leading-7 text-[var(--docs-muted)]">
                  No matching docs entries found for this query.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
