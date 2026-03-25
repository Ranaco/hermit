import { ApiPlayground } from "@/components/api-playground";
import type { ApiEndpoint } from "@/lib/api-reference";
import { endpointAuthLabel } from "@/lib/api-reference";

const methodClasses: Record<ApiEndpoint["method"], string> = {
  GET: "bg-emerald-500/12 text-emerald-200",
  POST: "bg-blue-500/12 text-blue-200",
  PUT: "bg-violet-500/12 text-violet-200",
  PATCH: "bg-amber-500/12 text-amber-200",
  DELETE: "bg-rose-500/12 text-rose-200",
  OPTIONS: "bg-slate-500/12 text-slate-200",
};

export function ApiEndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <details
      className="group border bg-[var(--docs-panel)]"
      style={{ borderColor: "var(--docs-border)" }}
      open={endpoint.defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-4 md:px-5">
        <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex min-w-16 justify-center rounded-sm px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${methodClasses[endpoint.method]}`}
            >
              {endpoint.method}
            </span>
          </div>

          <div className="min-w-0">
            <code className="block overflow-x-auto text-[13px] text-[var(--docs-soft)]">{endpoint.path}</code>
            <p className="mt-2 text-sm leading-6 text-[var(--docs-text)]">{endpoint.summary}</p>
          </div>

          <div className="text-left md:text-right">
            <span className="inline-flex rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--docs-muted)]" style={{ borderColor: "var(--docs-border)" }}>
              {endpointAuthLabel[endpoint.auth]}
            </span>
          </div>
        </div>
      </summary>

      <div className="border-t px-4 py-5 md:px-5" style={{ borderColor: "var(--docs-border)" }}>
        {endpoint.notes?.length ? (
          <div className="mb-5 border-l-2 border-amber-300 bg-amber-500/8 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">Implementation notes</p>
            <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[var(--docs-muted)]">
              {endpoint.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <ApiPlayground endpoint={endpoint} />
      </div>
    </details>
  );
}
