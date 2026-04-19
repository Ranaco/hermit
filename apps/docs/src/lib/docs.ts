export type TocItem = {
  id: string;
  label: string;
};

export type DocPageKind = "home" | "section" | "article";

export type DocPageId =
  | "overview"
  | "architecture"
  | "securityModel"
  | "operatorWorkflows"
  | "apiOverview"
  | "apiAuthentication"
  | "apiResources"
  | "apiErrors"
  | "cliOverview";

export type DocPageMeta = {
  id: DocPageId;
  title: string;
  description: string;
  group: "Start here" | "Core system" | "API reference" | "CLI";
  kind: DocPageKind;
  navLabel: string;
  href: string;
  eyebrow: string;
  toc: TocItem[];
  parent?: DocPageId;
  children?: DocPageId[];
  prev?: DocPageId;
  next?: DocPageId;
};

export type SidebarGroup = {
  title: string;
  items: DocPageMeta[];
};

export const docsPages = {
  overview: {
    id: "overview",
    title: "Hermit Docs",
    description:
      "Reference-first documentation for Hermit's architecture, security model, operator workflows, API surface, and CLI direction.",
    group: "Start here",
    kind: "home",
    navLabel: "Home",
    href: "/",
    eyebrow: "Documentation",
    toc: [],
    next: "architecture",
  },
  architecture: {
    id: "architecture",
    title: "Architecture",
    description:
      "Service boundaries, storage model, request flow, and how the web app, API, Vault transit, and database fit together.",
    group: "Core system",
    kind: "article",
    navLabel: "Architecture",
    href: "/architecture",
    eyebrow: "Core system",
    toc: [
      { id: "system-boundaries", label: "System boundaries" },
      { id: "entity-model", label: "Entity model" },
      { id: "request-flow", label: "Request flow" },
      { id: "deployment-shape", label: "Deployment shape" },
    ],
    prev: "overview",
    next: "securityModel",
  },
  securityModel: {
    id: "securityModel",
    title: "Security model",
    description:
      "How IAM, URNs, owner bypass, vault and secret passwords, and audit logging combine into Hermit's protection model.",
    group: "Core system",
    kind: "article",
    navLabel: "Security model",
    href: "/security-model",
    eyebrow: "Core system",
    toc: [
      { id: "iam-policy-engine", label: "IAM policy engine" },
      { id: "three-tier-protection", label: "Three-tier protection" },
      { id: "audit-behavior", label: "Audit behavior" },
      { id: "compliance-controls", label: "Compliance controls" },
      { id: "important-constraints", label: "Important constraints" },
    ],
    prev: "architecture",
    next: "operatorWorkflows",
  },
  operatorWorkflows: {
    id: "operatorWorkflows",
    title: "Operator workflows",
    description:
      "Dashboard, CLI, invitations, one-time shares, and deployment/runtime flows that make Hermit practical to operate.",
    group: "Core system",
    kind: "article",
    navLabel: "Operator workflows",
    href: "/operator-workflows",
    eyebrow: "Core system",
    toc: [
      { id: "dashboard-flows", label: "Dashboard flows" },
      { id: "cli-role", label: "CLI role" },
      { id: "sharing-and-invites", label: "Sharing and invites" },
      { id: "runtime-and-deploy", label: "Runtime and deploy" },
    ],
    prev: "securityModel",
    next: "apiOverview",
  },
  apiOverview: {
    id: "apiOverview",
    title: "API",
    description:
      "How Hermit's control plane is organized, which request models exist, and where to move next for authentication, resources, and failure behavior.",
    group: "API reference",
    kind: "section",
    navLabel: "API",
    href: "/api/overview",
    eyebrow: "API reference",
    toc: [],
    children: ["apiAuthentication", "apiResources", "apiErrors"],
    prev: "operatorWorkflows",
    next: "apiAuthentication",
  },
  apiAuthentication: {
    id: "apiAuthentication",
    title: "Authentication",
    description:
      "Bearer auth, MFA, device enrollment, CLI request signing, and the concrete endpoints used to bootstrap and maintain sessions.",
    group: "API reference",
    kind: "article",
    navLabel: "Authentication",
    href: "/api/authentication",
    eyebrow: "API reference",
    parent: "apiOverview",
    toc: [
      { id: "auth-modes", label: "Auth modes" },
      { id: "bearer-and-mfa", label: "Bearer and MFA" },
      { id: "cli-signing", label: "CLI signing" },
      { id: "auth-endpoints", label: "Auth endpoints" },
    ],
    prev: "apiOverview",
    next: "apiResources",
  },
  apiResources: {
    id: "apiResources",
    title: "Resources",
    description:
      "Grouped endpoint reference for organizations, vaults, groups, keys, secrets, shares, onboarding, and audit, with live request testing.",
    group: "API reference",
    kind: "article",
    navLabel: "Resources",
    href: "/api/resources",
    eyebrow: "API reference",
    parent: "apiOverview",
    toc: [
      { id: "resource-model", label: "Resource model" },
      { id: "quick-tests", label: "Quick tests" },
      { id: "system", label: "System" },
      { id: "organizations", label: "Organizations" },
      { id: "vaults-keys", label: "Vaults and keys" },
      { id: "secrets", label: "Secrets" },
      { id: "secret-groups", label: "Secret groups" },
      { id: "sharing", label: "Sharing" },
      { id: "onboarding", label: "Onboarding" },
      { id: "audit", label: "Audit" },
    ],
    prev: "apiAuthentication",
    next: "apiErrors",
  },
  apiErrors: {
    id: "apiErrors",
    title: "Errors",
    description:
      "Common response envelopes, policy denial, validation failures, share-consumption errors, and 403 reveal challenges.",
    group: "API reference",
    kind: "article",
    navLabel: "Errors",
    href: "/api/errors",
    eyebrow: "API reference",
    parent: "apiOverview",
    toc: [
      { id: "error-envelope", label: "Error envelope" },
      { id: "common-failures", label: "Common failures" },
      { id: "reveal-challenges", label: "Reveal challenges" },
    ],
    prev: "apiResources",
    next: "cliOverview",
  },
  cliOverview: {
    id: "cliOverview",
    title: "CLI",
    description:
      "Terminal-oriented reference for device enrollment, request signing, secret operations, and runtime injection workflows.",
    group: "CLI",
    kind: "section",
    navLabel: "CLI",
    href: "/cli/overview",
    eyebrow: "CLI",
    toc: [],
    prev: "apiErrors",
  },
} satisfies Record<DocPageId, DocPageMeta>;

export const sidebarGroups: SidebarGroup[] = [
  {
    title: "Start here",
    items: [docsPages.overview],
  },
  {
    title: "Core system",
    items: [
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

export function normalizeDocHref(pathname: string) {
  if (pathname.startsWith("/docs")) {
    const trimmed = pathname.slice(5);
    return trimmed.length > 0 ? trimmed : "/";
  }

  return pathname || "/";
}

export function getDocPage(id: DocPageId) {
  return docsPages[id];
}

export function getChildPages(page: DocPageMeta) {
  return (page.children ?? []).map((id) => docsPages[id]);
}

export function getPrevPage(page: DocPageMeta) {
  return page.prev ? docsPages[page.prev] : null;
}

export function getNextPage(page: DocPageMeta) {
  return page.next ? docsPages[page.next] : null;
}

export function getDescendantPaths(page: DocPageMeta) {
  return getChildPages(page).map((child) => child.href);
}
