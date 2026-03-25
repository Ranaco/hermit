import { ApiEndpointCard } from "@/components/api-endpoint-card";
import type { ApiEndpointGroup as ApiEndpointGroupType } from "@/lib/api-reference";

export function ApiEndpointGroup({ group }: { group: ApiEndpointGroupType }) {
  return (
    <section id={group.id} className="mt-12 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--docs-border)" }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--docs-soft)]">
            Resource group
          </p>
          <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-[var(--docs-text)]">
            {group.title}
          </h2>
        </div>
        <p className="max-w-[38rem] text-sm leading-6 text-[var(--docs-muted)]">{group.description}</p>
      </div>
      <div className="space-y-3">
        {group.endpoints.map((endpoint) => (
          <ApiEndpointCard key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </section>
  );
}
