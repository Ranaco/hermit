import ArchitectureDoc from "@/content/architecture.mdx";
import { DocsPage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsPage page={docsPages.architecture}>
      <ArchitectureDoc />
    </DocsPage>
  );
}
