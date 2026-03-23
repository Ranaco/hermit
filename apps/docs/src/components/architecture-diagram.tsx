export function ArchitectureDiagram() {
  const box = "rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white";

  return (
    <div className="mt-8 rounded-3xl border border-white/8 bg-black/20 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Edge</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">nginx</p>
          <p className="mt-2 text-[13px] leading-6 text-white/60">
            Terminates TLS and forwards `/`, `/api`, `/health`, `/status`, and `/docs`.
          </p>
        </div>

        <div className="hidden text-white/34 lg:block">→</div>

        <div className="space-y-4">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Public apps</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">web + docs</p>
            <p className="mt-2 text-[13px] leading-6 text-white/60">
              Next.js surfaces for the dashboard, landing pages, public sharing, and documentation.
            </p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Control plane</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">api</p>
            <p className="mt-2 text-[13px] leading-6 text-white/60">
              Express 4.x API for auth, policy enforcement, vault/key/secret flows, sharing, and audit.
            </p>
          </div>
        </div>

        <div className="hidden text-white/34 lg:block">→</div>

        <div className="space-y-4">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Metadata</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">PostgreSQL + Prisma</p>
            <p className="mt-2 text-[13px] leading-6 text-white/60">
              Users, organizations, vaults, keys, secrets, policies, invitations, and audit metadata.
            </p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Crypto</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">HCV / Vault Transit</p>
            <p className="mt-2 text-[13px] leading-6 text-white/60">
              Encryption, decryption, and key rotation for secret material and wrapped key operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
