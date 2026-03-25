"use client";

import { CopyButton } from "@/components/copy-button";

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className="docs-code-block">
      <div className="docs-code-block__header">
        <span className="docs-code-block__label">{language ?? "snippet"}</span>
        <CopyButton value={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
