import type { ReactNode } from "react";
import type { DocPageMeta } from "@/lib/docs";
import { DocsShell } from "@/components/docs-shell";

export function DocsPage({
  page,
  children,
}: {
  page: DocPageMeta;
  children: ReactNode;
}) {
  return (
    <DocsShell page={page}>
      <div className="docs-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="border-b border-white/8 pb-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">{page.section}</p>
          <h1 className="mt-4 text-[clamp(2.4rem,4vw,4rem)] font-semibold leading-[1] tracking-[-0.06em] text-white">
            {page.title}
          </h1>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-8 text-white/60">{page.description}</p>
        </div>
        <article className="docs-prose pt-8">{children}</article>
      </div>
    </DocsShell>
  );
}
