import type { ReactNode } from "react";

export function Callout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="docs-surface mt-6 border-l-2 border-l-[var(--docs-accent)] bg-[color:color-mix(in_oklab,var(--docs-accent)_8%,var(--docs-panel))] px-5 py-4">
      <p className="docs-display text-lg font-semibold tracking-[-0.03em] text-[var(--docs-text)]">{title}</p>
      <div className="mt-2 text-sm leading-7 text-[var(--docs-muted)]">{children}</div>
    </div>
  );
}
