import type { ReactNode } from "react";

export function Callout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/8 bg-[rgba(138,180,255,0.08)] px-5 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-2 text-sm leading-7 text-white/70">{children}</div>
    </div>
  );
}
