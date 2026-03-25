import { Callout } from "@/components/callout";
import { CodeBlock } from "@/components/code-block";
import { DocsArticlePage } from "@/components/docs-page";
import { ApiEndpointGroup } from "@/components/api-endpoint-group";
import { authEndpoints } from "@/lib/api-reference";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsArticlePage page={docsPages.apiAuthentication}>
      <h2 id="auth-modes">Auth modes</h2>
      <p>
        Hermit authenticates API traffic in three layers: public access, bearer token access, and signed official CLI
        access. Most application traffic is bearer-authenticated, while CLI-only secret flows add request-signature
        validation on top of the authenticated device session.
      </p>

      <h2 id="bearer-and-mfa">Bearer and MFA</h2>
      <p>
        The common authenticated entrypoint is <code>Authorization: Bearer &lt;token&gt;</code>. Sensitive routes can
        also enforce MFA with an <code>X-MFA-Token</code> header.
      </p>
      <CodeBlock
        language="http"
        code={`Authorization: Bearer <access-token>
X-MFA-Token: <6-digit-token>`}
      />

      <h2 id="cli-signing">CLI signing</h2>
      <p>
        CLI-specific endpoints do not accept bearer auth alone. They require a trusted enrolled device and signed
        request metadata.
      </p>
      <CodeBlock
        language="http"
        code={`X-Hermit-Device-Id: <device-id>
X-Hermit-Signature: <base64-signature>
X-Hermit-Nonce: <single-use-nonce>
X-Hermit-Timestamp: <unix-ms>`}
      />
      <Callout title="CLI request rules are stronger by design">
        Secret CLI reveal and bulk reveal routes enforce both user identity and device-level proof. This keeps runtime
        automation from degrading into generic bearer-token replay.
      </Callout>

      <h2 id="auth-endpoints">Auth endpoints</h2>
      <p>
        The following endpoints cover session bootstrap, MFA lifecycle, device management, and self-service account
        flows.
      </p>
      {authEndpoints.map((group) => (
        <ApiEndpointGroup key={group.id} group={group} />
      ))}
    </DocsArticlePage>
  );
}
