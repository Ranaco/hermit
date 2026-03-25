"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[11px] uppercase tracking-[0.22em] text-[var(--docs-muted)] transition-colors hover:border-[var(--docs-border-strong)] hover:text-[var(--docs-text)] ${className}`}
      style={{ borderColor: "var(--docs-border)" }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
