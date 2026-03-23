import { DocsPage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsPage page={docsPages.apiOverview}>
      <h2 id="planned-scope">Planned scope</h2>
      <p>
        The API reference will expand this docs site with authentication, resource-by-resource request examples,
        and request or response patterns for organizations, vaults, keys, secrets, invitations, shares, and audit.
      </p>
      <p>
        This first release focuses on the architecture, security model, and operator surface so the later API
        reference can sit on top of a clear explanation of how Hermit works.
      </p>
    </DocsPage>
  );
}
