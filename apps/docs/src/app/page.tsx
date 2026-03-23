import OverviewDoc from "@/content/overview.mdx";
import { DocsPage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsPage page={docsPages.overview}>
      <OverviewDoc />
    </DocsPage>
  );
}
