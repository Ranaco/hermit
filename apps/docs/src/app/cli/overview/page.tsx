import Link from "next/link";
import { DocsSectionPage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsSectionPage page={docsPages.cliOverview}>
      <p>
        The CLI reference is intentionally staged as a section landing page for now. It establishes the role of the
        official terminal workflow and leaves room for command-level leaf pages as the surface expands.
      </p>

      <h2 id="planned-scope">Planned scope</h2>
      <p>
        The CLI reference will cover device enrollment, login and refresh, organization and vault selection, secret
        operations, and the <code>hermit run</code> injection workflow.
      </p>
      <p>
        For current operational context, see <Link href="/operator-workflows">Operator workflows</Link>. For the
        request model behind signed secret access, see <Link href="/api/authentication">API authentication</Link>.
      </p>
    </DocsSectionPage>
  );
}
