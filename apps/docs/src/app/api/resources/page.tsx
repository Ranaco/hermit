import { Callout } from "@/components/callout";
import { DocsArticlePage } from "@/components/docs-page";
import { ApiEndpointGroup } from "@/components/api-endpoint-group";
import { resourceEndpoints } from "@/lib/api-reference";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsArticlePage page={docsPages.apiResources}>
      <h2 id="resource-model">Resource model</h2>
      <p>
        Hermit&apos;s resource surface follows the same hierarchy that drives the product itself: organizations contain
        vaults, vaults contain keys and secrets, and secrets can live inside groups while remaining subject to IAM,
        reveal policy, and audit behavior.
      </p>
      <Callout title="This page is the live endpoint surface">
        Public system endpoints come first so you can confirm host alignment and API health before moving into
        authenticated flows. Every endpoint below includes a built-in request runner.
      </Callout>
      <Callout title="Internal readiness endpoint">
        <code>/readyz</code> is documented here for operators, but it is internal-only and is not routed through the
        public ingress path.
      </Callout>

      <h2 id="quick-tests">Quick tests</h2>
      <p>
        Start with the public system endpoints before moving into authenticated routes. They confirm the docs host,
        API host, and request runner are wired correctly in your browser.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          { label: "Health", href: "#system", detail: "Basic API liveness." },
          { label: "Status", href: "#system", detail: "Checks database and Vault connectivity." },
          { label: "API info", href: "#system", detail: "Reads static API metadata and feature flags." },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="border bg-[var(--docs-panel)] px-4 py-4 transition-colors hover:border-[var(--docs-border-strong)]"
            style={{ borderColor: "var(--docs-border)" }}
          >
            <p className="text-sm font-semibold text-[var(--docs-text)]">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--docs-muted)]">{item.detail}</p>
          </a>
        ))}
      </div>

      {resourceEndpoints.map((group) => (
        <ApiEndpointGroup key={group.id} group={group} />
      ))}
    </DocsArticlePage>
  );
}
