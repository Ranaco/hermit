import Link from "next/link";
import { ArrowRight, BookOpenText, GitBranch, Shield, TerminalSquare, Waypoints } from "lucide-react";
import { DocsHomePage } from "@/components/docs-page";
import { docsPages } from "@/lib/docs";

const categories = [
  {
    title: "Architecture",
    href: "/architecture",
    description: "System boundaries, entity flow, transit encryption, and deployment shape.",
    icon: Waypoints,
  },
  {
    title: "Security",
    href: "/security-model",
    description: "IAM evaluation, URNs, owner bypass, reveal challenges, and audit behavior.",
    icon: Shield,
  },
  {
    title: "Operator workflows",
    href: "/operator-workflows",
    description: "Dashboard flows, invites, shares, deployments, and runtime handling.",
    icon: GitBranch,
  },
  {
    title: "API",
    href: "/api/overview",
    description: "Overview, authentication, resources, errors, and the raw OpenAPI artifact.",
    icon: BookOpenText,
  },
  {
    title: "CLI",
    href: "/cli/overview",
    description: "Command-line enrollment, signed secret access, and runtime injection direction.",
    icon: TerminalSquare,
  },
];

export default function Page() {
  return (
    <DocsHomePage page={docsPages.overview}>
      <section className="docs-hero">
        <p className="docs-kicker">Hermit Documentation</p>
        <h1 className="docs-page-title">Reference for the control plane behind secrets, keys, and policy.</h1>
        <p className="docs-page-description">
          Hermit pairs Vault transit-backed cryptography with an explicit operator model: organizations, vaults,
          keys, secrets, IAM policy evaluation, invite workflows, and runtime-safe reveal paths. This docs surface is
          organized like a reference system rather than a marketing page.
        </p>
      </section>

      <section className="mt-8">
        <div className="grid gap-px border bg-[var(--docs-border)] md:grid-cols-2 xl:grid-cols-3">
          {categories.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="group bg-[var(--docs-panel)] px-5 py-5 transition-colors hover:bg-[var(--docs-panel-elevated)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.04em] text-[var(--docs-text)]">{item.title}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--docs-muted)]">{item.description}</p>
                  </div>
                  <Icon className="mt-0.5 h-4 w-4 text-[var(--docs-soft)] transition-colors group-hover:text-[var(--docs-accent)]" />
                </div>
                <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--docs-soft)]">
                  Open section
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-10 border-t pt-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]" style={{ borderColor: "var(--docs-border)" }}>
        <div>
          <p className="docs-kicker">What Hermit is</p>
          <h2 className="mt-3 max-w-[18ch] text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[1] tracking-[-0.06em]">
            A multi-tenant KMS and secret operations platform with explicit structure.
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-[var(--docs-muted)]">
            Hermit is designed for teams that need the cryptographic backend, tenant hierarchy, and access-control
            logic to stay visible. The system keeps parent selection explicit during creation flows, evaluates IAM
            policies against resource URNs at request time, and preserves vault-level versus secret-level password
            challenges through the reveal path.
          </p>
        </div>

        <div className="grid gap-px border bg-[var(--docs-border)]">
          {[
            "Organizations contain vaults, which contain keys and secrets.",
            "Vault transit remains the source of truth for encryption and decryption.",
            "Dynamic IAM policy evaluation sits in the request path, not outside it.",
            "Operator workflows matter as much as the cryptographic primitives.",
          ].map((item) => (
            <div key={item} className="bg-[var(--docs-panel)] px-5 py-4 text-sm leading-6 text-[var(--docs-muted)]">
              {item}
            </div>
          ))}
        </div>
      </section>
    </DocsHomePage>
  );
}
