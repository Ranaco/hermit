import { Callout } from "@/components/callout";
import { CodeBlock } from "@/components/code-block";
import { DocsArticlePage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsArticlePage page={docsPages.apiErrors}>
      <h2 id="error-envelope">Error envelope</h2>
      <p>
        Hermit primarily uses an envelope-style response model. Successful responses usually return{" "}
        <code>success: true</code>, and unsuccessful responses return <code>success: false</code> plus an explicit
        error payload.
      </p>
      <CodeBlock
        language="json"
        code={`{
  "success": false,
  "error": "No authentication token provided",
  "code": "UNAUTHORIZED",
  "message": "Optional human-readable detail"
}`}
      />

      <h2 id="common-failures">Common failures</h2>
      <ul>
        <li><strong>401 Unauthorized</strong>: missing or invalid bearer token.</li>
        <li><strong>403 Forbidden</strong>: policy denial, insufficient permissions, or a reveal-password challenge branch.</li>
        <li><strong>400 Validation error</strong>: body, query, or params failed Zod validation.</li>
        <li><strong>404 Not found</strong>: target resource does not exist or is not accessible through the mounted path.</li>
        <li><strong>429 Too many requests</strong>: auth and crypto-heavy routes are rate-limited.</li>
      </ul>
      <Callout title="Policy denial and not-found can look similar from the client side">
        The API performs resource lookups, organization scoping, and policy evaluation together. Client code should
        not assume every rejected request is a simple role check failure.
      </Callout>

      <h2 id="reveal-challenges">Reveal challenges</h2>
      <p>
        Secret reveal is the main place where a <code>403</code> is not necessarily terminal. A caller can be fully
        authorized and still receive an interactive challenge requiring either a vault password or a secret-level
        password before decryption can proceed.
      </p>
      <CodeBlock
        language="json"
        code={`{
  "success": false,
  "error": "Vault password required",
  "requiresPassword": "vault"
}`}
      />
      <p>
        Share consumption has its own user-facing failure modes as well: expired links, exhausted one-time shares,
        missing passphrases, and invalid share tokens should all be handled as expected product branches rather than
        generic transport failures.
      </p>
    </DocsArticlePage>
  );
}
