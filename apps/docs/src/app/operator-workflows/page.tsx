import WorkflowsDoc from "@/content/operator-workflows.mdx";
import { DocsArticlePage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

export default function Page() {
  return (
    <DocsArticlePage page={docsPages.operatorWorkflows}>
      <WorkflowsDoc />
    </DocsArticlePage>
  );
}
