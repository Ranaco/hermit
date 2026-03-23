import { DocsPage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsPage page={docsPages.cliOverview}>
      <h2 id="planned-scope">Planned scope</h2>
      <p>
        The CLI reference will cover device enrollment, login and refresh, organization and vault selection, secret
        operations, and the <code>hermit run</code> injection workflow.
      </p>
      <p>
        The operator workflows page already explains where the CLI fits in the current platform. This section is
        reserved for fuller command-level documentation in the next phase.
      </p>
    </DocsPage>
  );
}
