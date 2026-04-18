import Link from "next/link";
import { Callout } from "@/components/callout";
import { CodeBlock } from "@/components/code-block";
import { DocsSectionPage } from "@/components/docs-page";
import { apiEndpointGroups, apiPlaygroundPresets, endpointAuthLabel } from "@/lib/api-reference";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsSectionPage page={docsPages.apiOverview}>
      <p>
        Hermit&apos;s API is the control plane for authentication, organization and team access, vault and key
        lifecycle, secret storage and reveal, one-time sharing, onboarding, and audit retrieval. The reference is
        split into focused sections so the API reads as a system, not a raw endpoint dump.
      </p>

      <Callout title="Policy stays in the request path">
        Authorization is not modeled as a static role table alone. Resource routes evaluate custom IAM policies
        against URNs at request time, with explicit <code>DENY</code> overriding <code>ALLOW</code>.
      </Callout>

      <h2 id="surface-shape">Surface shape</h2>
      <p>
        Production requests use the same host as the application. Operational health endpoints remain at the origin
        root, while most product functionality sits below <code>/api</code>.
      </p>
      <CodeBlock
        language="http"
        code={`Base URL: https://hermit.ranax.co/api
Health:   https://hermit.ranax.co/health
Status:   https://hermit.ranax.co/status`}
      />
      <p className="mt-4">
        Hermit also exposes <code>/readyz</code> for internal readiness checks, but it is intentionally kept off the
        public ingress surface. Use it only from the internal network that can reach the API service directly.
      </p>

      <h2 id="request-modes">Request modes</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {(["public", "bearer", "cli"] as const).map((authMode) => (
          <div
            key={authMode}
            className="border bg-[var(--docs-panel)] px-4 py-4"
            style={{ borderColor: "var(--docs-border)" }}
          >
            <p className="text-sm font-semibold text-[var(--docs-text)]">{endpointAuthLabel[authMode]}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--docs-muted)]">
              {authMode === "public"
                ? "System health, session bootstrap, reset flows, and public share consumption."
                : authMode === "bearer"
                  ? "Standard authenticated browser and API client flows using bearer tokens."
                  : "CLI-only secret operations that require bearer auth plus signed request metadata."}
            </p>
          </div>
        ))}
      </div>

      <CodeBlock
        language="http"
        code={`Authorization: Bearer <access-token>
X-MFA-Token: <6-digit-token>
X-Hermit-Device-Id: <device-id>
X-Hermit-Signature: <base64-signature>
X-Hermit-Nonce: <single-use-nonce>
X-Hermit-Timestamp: <unix-ms>`}
      />

      <h2 id="response-shape">Response shape</h2>
      <p>
        Success responses generally carry <code>success: true</code> and a payload under <code>data</code>. Error
        responses preserve explicit branching, including reveal password challenges that are interactive rather than
        terminal.
      </p>
      <CodeBlock
        language="json"
        code={`{
  "success": true,
  "data": { "...": "..." },
  "message": "Optional status text"
}`}
      />
      <CodeBlock
        language="json"
        code={`{
  "success": false,
  "error": "Vault password required",
  "requiresPassword": "vault"
}`}
      />

      <h2 id="endpoint-groups">Endpoint groups</h2>
      <div className="mt-6 grid gap-3">
        {apiEndpointGroups.map((group) => (
          <div key={group.id} className="border bg-[var(--docs-panel)] px-4 py-4" style={{ borderColor: "var(--docs-border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--docs-text)]">{group.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--docs-muted)]">{group.description}</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">
                {group.endpoints.length} endpoints
              </span>
            </div>
          </div>
        ))}
      </div>

      <h2 id="worked-examples">Worked examples</h2>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://hermit.ranax.co/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "operator@example.com",
    "password": "Str0ng!Pass"
  }'

curl https://hermit.ranax.co/api/users/me \\
  -H "Authorization: Bearer <access-token>"`}
      />
      <CodeBlock
        language="bash"
        code={`curl -X POST https://hermit.ranax.co/api/keys \\
  -H "Authorization: Bearer <access-token>" \\
  -H "Content-Type: application/json" \\
  -d '${apiPlaygroundPresets.keyCreate.requestExample}'

curl -X POST https://hermit.ranax.co/api/keys/<key-id>/encrypt \\
  -H "Authorization: Bearer <access-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "plaintext": "sk_live_example"
  }'`}
      />
      <CodeBlock
        language="bash"
        code={`curl -X POST https://hermit.ranax.co/api/secrets/<secret-id>/reveal \\
  -H "Authorization: Bearer <access-token>" \\
  -H "Content-Type: application/json" \\
  -d '${apiPlaygroundPresets.secretReveal.requestExample}'

# If the secret or vault is password protected, expect:
{
  "success": false,
  "error": "Vault password required",
  "requiresPassword": "vault"
}`}
      />

      <h2 id="openapi-artifact">OpenAPI artifact</h2>
      <p>
        The raw OpenAPI file tracks the mounted surface and auth models. It remains the public artifact behind this
        reference layer.
      </p>
      <p>
        <Link href="/openapi/hermit.v1.yaml">Download or inspect <code>hermit.v1.yaml</code></Link>
      </p>
    </DocsSectionPage>
  );
}
