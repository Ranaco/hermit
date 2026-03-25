import type { ReactNode } from "react";

export function Callout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 border-l-2 border-[var(--docs-accent)] bg-[color:color-mix(in_oklab,var(--docs-accent)_9%,var(--docs-panel))] px-5 py-4">
      <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--docs-text)]">{title}</p>
      <div className="mt-2 text-sm leading-7 text-[var(--docs-muted)]">{children}</div>
    </div>
  );
}
