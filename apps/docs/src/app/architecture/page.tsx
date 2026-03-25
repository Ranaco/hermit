import ArchitectureDoc from "@/content/architecture.mdx";
import { DocsArticlePage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsArticlePage page={docsPages.architecture}>
      <ArchitectureDoc />
    </DocsArticlePage>
  );
}
