export type TocItem = {
  id: string;
  label: string;
};

export type DocPageMeta = {
  title: string;
  description: string;
  section: "Core" | "Reference";
  navLabel: string;
  href: string;
  toc: TocItem[];
};

export const docsPages = {
  overview: {
    title: "Introduction",
    description:
      "What Hermit is, why it exists, and how the platform organizes secrets, keys, policy, and operator workflows.",
    section: "Core",
    navLabel: "Introduction",
    href: "/",
    toc: [
      { id: "why-hermit-exists", label: "Why Hermit exists" },
      { id: "what-hermit-contains", label: "What Hermit contains" },
      { id: "core-ideas", label: "Core ideas" },
      { id: "when-to-use-it", label: "When to use it" },
    ],
  },
  architecture: {
    title: "Architecture",
    description:
      "Service boundaries, storage model, request flow, and how the web app, API, Vault transit, and database fit together.",
    section: "Core",
    navLabel: "Architecture",
    href: "/architecture",
    toc: [
      { id: "system-boundaries", label: "System boundaries" },
      { id: "entity-model", label: "Entity model" },
      { id: "request-flow", label: "Request flow" },
      { id: "deployment-shape", label: "Deployment shape" },
    ],
  },
  securityModel: {
    title: "Security model",
    description:
      "How IAM, URNs, owner bypass, vault and secret passwords, and audit logging combine into Hermit’s protection model.",
    section: "Core",
    navLabel: "Security model",
    href: "/security-model",
    toc: [
      { id: "iam-policy-engine", label: "IAM policy engine" },
      { id: "three-tier-protection", label: "Three-tier protection" },
      { id: "audit-behavior", label: "Audit behavior" },
      { id: "important-constraints", label: "Important constraints" },
    ],
  },
  operatorWorkflows: {
    title: "Operator workflows",
    description:
      "Dashboard, CLI, invitations, one-time shares, and deployment/runtime flows that make Hermit practical to operate.",
    section: "Core",
    navLabel: "Operator workflows",
    href: "/operator-workflows",
    toc: [
      { id: "dashboard-flows", label: "Dashboard flows" },
      { id: "cli-role", label: "CLI role" },
      { id: "sharing-and-invites", label: "Sharing and invites" },
      { id: "runtime-and-deploy", label: "Runtime and deploy" },
    ],
  },
  apiOverview: {
    title: "API overview",
    description:
      "Planned reference for Hermit API authentication, resources, and request patterns.",
    section: "Reference",
    navLabel: "API overview",
    href: "/api/overview",
    toc: [{ id: "planned-scope", label: "Planned scope" }],
  },
  cliOverview: {
    title: "CLI overview",
    description:
      "Planned reference for terminal authentication, secret operations, and run-time injection.",
    section: "Reference",
    navLabel: "CLI overview",
    href: "/cli/overview",
    toc: [{ id: "planned-scope", label: "Planned scope" }],
  },
} satisfies Record<string, DocPageMeta>;

export const sidebarGroups = [
  {
    title: "Core",
    items: [
      docsPages.overview,
      docsPages.architecture,
      docsPages.securityModel,
      docsPages.operatorWorkflows,
    ],
  },
  {
    title: "Reference",
    items: [docsPages.apiOverview, docsPages.cliOverview],
  },
];
