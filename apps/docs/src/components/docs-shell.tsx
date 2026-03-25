"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink, Github, Menu, MoonStar, Search, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/logo-mark";
import {
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
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      selected
                        ? "bg-[var(--docs-panel)] text-[var(--docs-text)]"
                        : "text-[var(--docs-muted)] hover:bg-[var(--docs-panel)] hover:text-[var(--docs-text)]"
                    }`}
                  >
                    <span>{item.navLabel}</span>
                    {item.children?.length ? (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
                      />
                    ) : null}
                  </Link>

                  {expanded && item.children?.length ? (
                    <div className="mt-1 ml-3 border-l pl-3" style={{ borderColor: "var(--docs-border)" }}>
                      {getChildPages(item).map((child) => {
                        const childSelected = pathname === child.href;
                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={`mt-1 block rounded-md px-3 py-2 text-sm transition-colors ${
                              childSelected
                                ? "text-[var(--docs-text)]"
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(currentTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("hermit-docs-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="min-h-screen bg-[var(--docs-bg)] text-[var(--docs-text)]">
      <header className="sticky top-0 z-40 border-b bg-[color:color-mix(in_oklab,var(--docs-bg)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto grid h-14 max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[auto_minmax(18rem,28rem)_auto] lg:px-8">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-[var(--docs-panel)]">
                <LogoMark className="h-4.5 w-4.5 text-[var(--docs-accent)]" />
              </div>
              <span className="font-[650] tracking-[-0.04em] text-[var(--docs-text)]">Hermit</span>
            </Link>

            <nav className="hidden items-center gap-4 text-sm text-[var(--docs-muted)] lg:flex">
              <Link href="/" className="hover:text-[var(--docs-text)]">
                Docs
              </Link>
              <Link href="/api/overview" className="hover:text-[var(--docs-text)]">
                API
              </Link>
              <Link href="/cli/overview" className="hover:text-[var(--docs-text)]">
                CLI
              </Link>
              <Link href="https://hermit.ranax.co" className="hover:text-[var(--docs-text)]">
                Site
              </Link>
            </nav>
          </div>

          <button
            type="button"
            className="hidden h-10 items-center gap-3 rounded-md border bg-[var(--docs-panel)] px-3 text-left text-sm text-[var(--docs-muted)] transition-colors hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)] md:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Search documentation</span>
            <span className="rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em]">Ctrl K</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <Link
              href="https://github.com/ranaco/hermit"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-[var(--docs-muted)] transition-colors hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)]"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-[var(--docs-muted)] transition-colors hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)]"
            >
              {theme === "dark" ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <MoonStar className="h-4 w-4" />
              )}
            </button>
            <Link
              href="https://hermit.ranax.co/login"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--docs-accent)] bg-[color:color-mix(in_oklab,var(--docs-accent)_14%,var(--docs-panel))] px-3 text-sm text-[var(--docs-text)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--docs-accent)_20%,var(--docs-panel))]"
            >
              App
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`mx-auto grid max-w-[1600px] gap-0 px-4 sm:px-6 lg:px-8 ${
          showToc ? "lg:grid-cols-[18rem_minmax(0,1fr)_15rem]" : "lg:grid-cols-[18rem_minmax(0,1fr)]"
        }`}
      >
        <aside className="hidden border-r lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-6 pt-8 pb-10">
            <DocsTree pathname={pathname} currentPage={page} />
          </div>
        </aside>

        <main className={`${showToc ? "lg:px-10" : "lg:px-12"} min-w-0 py-6 lg:py-10`}>
          <div className="mb-5 lg:hidden">
            <details className="rounded-md border bg-[var(--docs-panel)]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-[var(--docs-muted)]">
                <span className="inline-flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Browse docs
                </span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="border-t px-4 py-4">
                <DocsTree pathname={pathname} currentPage={page} />
              </div>
            </details>
          </div>
          {children}
        </main>

        {showToc ? (
          <aside className="hidden border-l xl:block">
            <div className="sticky top-20 pl-6 pt-10">
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

      <footer className="border-t">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-6 text-sm text-[var(--docs-soft)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>Hermit Docs. Built for operators working with secrets, policy, and transit-backed encryption.</p>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/ranaco/hermit" className="hover:text-[var(--docs-text)]">
              GitHub
            </Link>
            <Link href="https://hermit.ranax.co" className="hover:text-[var(--docs-text)]">
              Main site
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
