import SecurityDoc from "@/content/security-model.mdx";
import { DocsArticlePage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsArticlePage page={docsPages.securityModel}>
      <SecurityDoc />
    </DocsArticlePage>
  );
}
