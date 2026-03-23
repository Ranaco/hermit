"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo-mark";
import { sidebarGroups, type DocPageMeta } from "@/lib/docs";

export function DocsShell({
  page,
  children,
}: {
  page: DocPageMeta;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0b0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
              <LogoMark className="h-6 w-6 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold text-white">Hermit Docs</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/38">
                Architecture and operator guide
              </p>
            </div>
          </Link>

          <div className="hidden min-w-[18rem] items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-white/60 md:flex">
            <Search className="h-4 w-4" />
            <span className="flex-1">Search docs...</span>
            <span className="rounded-md border border-white/8 px-2 py-0.5 text-xs text-white/38">
              Ctrl K
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="https://hermit.ranax.co" className="text-sm text-white/60 transition-colors hover:text-white">
              Main site
            </Link>
            <Link
              href="https://hermit.ranax.co/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-white transition-colors hover:bg-white/[0.06]"
            >
              <Sparkles className="h-4 w-4" />
              Open app
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] gap-0 px-4 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:px-8">
        <aside className="hidden border-r border-white/8 py-10 lg:block">
          <div className="sticky top-24 pr-8">
            {sidebarGroups.map((group) => (
              <div key={group.title} className="mt-8 first:mt-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">{group.title}</p>
                <nav className="mt-4 flex flex-col gap-1">
                  {group.items.map((item) => {
                    const selected = pathname === item.href || pathname === `/docs${item.href}`;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                          selected
                            ? "bg-white/[0.06] text-white"
                            : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        {item.navLabel}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 py-10 lg:px-10">
          <div className="max-w-4xl">{children}</div>
        </main>

        <aside className="hidden border-l border-white/8 py-10 xl:block">
          <div className="sticky top-24 pl-8">
            <p className="text-sm font-medium text-white">On this page</p>
            <nav className="mt-4 flex flex-col gap-3 border-l border-white/8 pl-4">
              {page.toc.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="text-sm text-white/60 transition-colors hover:text-white">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
