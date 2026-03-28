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
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--docs-border)] pt-5 text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">
          <span>Policy-aware</span>
          <span className="hidden h-1 w-1 rounded-full bg-[var(--docs-border-strong)] sm:block" />
          <span>Vault-backed</span>
          <span className="hidden h-1 w-1 rounded-full bg-[var(--docs-border-strong)] sm:block" />
          <span>Operator-first</span>
        </div>
      </section>

      <section className="mt-8">
        <div className="docs-divider-list">
          {categories.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="docs-link-row group md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-start md:gap-8"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-[var(--docs-soft)] transition-colors duration-300 group-hover:text-[var(--docs-accent)]" />
                  <p className="docs-display text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--docs-text)]">{item.title}</p>
                </div>
                <p className="max-w-[56ch] text-sm leading-7 text-[var(--docs-muted)]">{item.description}</p>
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--docs-soft)] md:justify-self-end">
                  Open section
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-6 border-t pt-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]" style={{ borderColor: "var(--docs-border)" }}>
        <div>
          <p className="docs-kicker">What Hermit is</p>
          <h2 className="docs-display mt-3 max-w-[18ch] text-[clamp(2.1rem,3.6vw,3.2rem)] font-semibold leading-[1] tracking-[-0.04em] text-[var(--docs-text)]">
            A multi-tenant KMS and secret operations platform with explicit structure.
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-[var(--docs-muted)]">
            Hermit is designed for teams that need the cryptographic backend, tenant hierarchy, and access-control
            logic to stay visible. The system keeps parent selection explicit during creation flows, evaluates IAM
            policies against resource URNs at request time, and preserves vault-level versus secret-level password
            challenges through the reveal path.
          </p>
        </div>

        <div className="docs-divider-list">
          {[
            "Organizations contain vaults, which contain keys and secrets.",
            "Vault transit remains the source of truth for encryption and decryption.",
            "Dynamic IAM policy evaluation sits in the request path, not outside it.",
            "Operator workflows matter as much as the cryptographic primitives.",
          ].map((item) => (
            <div key={item} className="border-b border-[var(--docs-border)] py-4 text-sm leading-7 text-[var(--docs-muted)] last:border-b-0">
              {item}
            </div>
          ))}
        </div>
      </section>
    </DocsHomePage>
  );
}
