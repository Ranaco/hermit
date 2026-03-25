export function ArchitectureDiagram() {
  const box =
    "rounded-md border bg-[var(--docs-panel)] px-4 py-4 text-sm text-[var(--docs-text)]";

  return (
    <div className="mt-8 border bg-[color:color-mix(in_oklab,var(--docs-panel)_60%,var(--docs-bg))] p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">Edge</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">nginx</p>
          <p className="mt-2 text-[13px] leading-6 text-[var(--docs-muted)]">
            Terminates TLS and forwards <code>/</code>, <code>/api</code>, <code>/health</code>, <code>/status</code>,
            and <code>/docs</code>.
          </p>
        </div>

        <div className="hidden text-[var(--docs-soft)] lg:block">-&gt;</div>

        <div className="space-y-4">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">Public apps</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">web + docs</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--docs-muted)]">
              Next.js surfaces for the dashboard, landing pages, public sharing, and documentation.
            </p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">Control plane</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">api</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--docs-muted)]">
              Express 4.x API for auth, policy enforcement, vault, key, and secret flows, sharing, and audit.
            </p>
          </div>
        </div>

        <div className="hidden text-[var(--docs-soft)] lg:block">-&gt;</div>

        <div className="space-y-4">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">Metadata</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">PostgreSQL + Prisma</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--docs-muted)]">
              Users, organizations, vaults, keys, secrets, policies, invitations, and audit metadata.
            </p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--docs-soft)]">Crypto</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">HCV / Vault Transit</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--docs-muted)]">
              Encryption, decryption, and key rotation for secret material and wrapped key operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
