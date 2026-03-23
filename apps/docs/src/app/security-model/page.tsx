import SecurityDoc from "@/content/security-model.mdx";
import { DocsPage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsPage page={docsPages.securityModel}>
      <SecurityDoc />
    </DocsPage>
  );
}
