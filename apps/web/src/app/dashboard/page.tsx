"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, Building2, FileKey2, Loader2, Mail, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuditLogs } from "@/hooks/use-audit";
import { useAutoContext } from "@/hooks/use-auto-context";
import {
  useMyPendingInvitations,
  useOrganizationInvitations,
} from "@/hooks/use-organizations";
import { useKeys } from "@/hooks/use-keys";
import { useSecrets } from "@/hooks/use-secrets";
import { useVaults } from "@/hooks/use-vaults";
import { useRBAC } from "@/hooks/use-rbac";
import { useOrganizationStore } from "@/store/organization.store";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

function formatAuditAction(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  return dateFormatter.format(new Date(value));
}

function EmptyWorkspace({
  title,
  detail,
  linkHref,
  linkLabel,
}: {
  title: string;
  detail: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <section className="flex min-h-[360px] flex-col items-start justify-center gap-4 border border-border bg-card px-8 py-10">
      <p className="app-eyebrow">Workspace</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-xl text-sm text-muted-foreground">{detail}</p>
      </div>
      <Link
        href={linkHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
      >
        {linkLabel}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export default function DashboardPage() {
  useAutoContext();

  const permissions = useRBAC();
  const { currentOrganization, currentVault } = useOrganizationStore();

  const { data: myInvitations } = useMyPendingInvitations();
  const { data: vaults, isLoading: vaultsLoading } = useVaults(currentOrganization?.id);
  const { data: keys, isLoading: keysLoading } = useKeys(currentVault?.id);
  const { data: secrets, isLoading: secretsLoading } = useSecrets(currentVault?.id);
  const { data: organizationInvitations } = useOrganizationInvitations(
    currentOrganization?.id,
    permissions.canReadInvitations,
  );
  const { data: activity, isLoading: activityLoading } = useAuditLogs(
    {
      organizationId: currentOrganization?.id,
      vaultId: currentVault?.id,
      limit: 8,
    },
    Boolean(currentOrganization && currentVault),
  );

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <EmptyWorkspace
          title="Select a workspace"
          detail="Choose an organization to load keys, secrets, activity, and invitations."
          linkHref="/dashboard/organizations"
          linkLabel="Open organizations"
        />
      </DashboardLayout>
    );
  }

  const keysList = keys ?? [];
  const secretsList = secrets?.secrets ?? [];
  const outboundInvitations = organizationInvitations ?? [];
  const activityList = activity?.logs ?? [];
  const hasVault = Boolean(currentVault);

  if (!hasVault) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <section className="space-y-2 border-b border-border pb-6">
            <p className="app-eyebrow">Workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {currentOrganization.name}
            </h1>
            <p className="text-sm text-muted-foreground">Pick a vault to load workspace data.</p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Vaults", value: vaults?.length ?? 0 },
              ...(permissions.canReadInvitations
                ? [{ label: "Pending invites", value: outboundInvitations.length }]
                : []),
              { label: "For me", value: myInvitations?.length ?? 0 },
            ].map((item) => (
              <div key={item.label} className="border border-border bg-card px-5 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {vaultsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : item.value}
                </p>
              </div>
            ))}
          </section>

          <EmptyWorkspace
            title="No vault selected"
            detail="Select a vault from the sidebar to see recent activity, keys, and secrets."
            linkHref="/dashboard/vaults"
            linkLabel="Open vaults"
          />
        </div>
      </DashboardLayout>
    );
  }

  const selectedVault = currentVault!;

  const summary = [
    { label: "Keys", value: keysList.length, href: "/dashboard/keys", icon: FileKey2 },
    { label: "Secrets", value: secretsList.length, href: "/dashboard/secrets", icon: Shield },
    { label: "Vaults", value: vaults?.length ?? 0, href: "/dashboard/vaults", icon: Building2 },
    ...(permissions.canReadInvitations
      ? [
          {
            label: "Pending invites",
            value: outboundInvitations.length,
            href: "/dashboard/organizations",
            icon: Mail,
          },
        ]
      : []),
  ];

  const loading = keysLoading || secretsLoading || activityLoading;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="app-eyebrow">Workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {currentOrganization.name}
            </h1>
            <p className="text-sm text-muted-foreground">{selectedVault.name}</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/secrets" className="text-muted-foreground transition-colors hover:text-foreground">
              Secrets
            </Link>
            <Link href="/dashboard/keys" className="text-muted-foreground transition-colors hover:text-foreground">
              Keys
            </Link>
            <Link href="/dashboard/audit" className="text-muted-foreground transition-colors hover:text-foreground">
              Audit
            </Link>
            {permissions.canReadInvitations ? (
              <Link href="/dashboard/organizations" className="text-muted-foreground transition-colors hover:text-foreground">
                Invitations
              </Link>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : item.value}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
                </div>
                <Link href="/dashboard/audit" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-border">
                {activityList.length > 0 ? (
                  activityList.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-4 px-5 py-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {formatAuditAction(entry.action)}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {entry.resourceType.toLowerCase()} {entry.resourceId ? `• ${entry.resourceId.slice(0, 8)}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-sm text-muted-foreground">No workspace activity yet.</div>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <section className="border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-base font-semibold text-foreground">Recent keys</h2>
                  <Link href="/dashboard/keys" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Open
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {keysList.slice(0, 5).map((key) => (
                    <Link
                      key={key.id}
                      href="/dashboard/keys"
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{key.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{key.valueType}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(key.createdAt)}</span>
                    </Link>
                  ))}
                  {keysList.length === 0 && (
                    <div className="px-5 py-8 text-sm text-muted-foreground">No keys in this vault.</div>
                  )}
                </div>
              </section>

              <section className="border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-base font-semibold text-foreground">Recent secrets</h2>
                  <Link href="/dashboard/secrets" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Open
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {secretsList.slice(0, 5).map((secret) => (
                    <Link
                      key={secret.id}
                      href={`/dashboard/secrets/${secret.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{secret.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          v{secret.currentVersion?.versionNumber ?? "1"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(secret.updatedAt)}</span>
                    </Link>
                  ))}
                  {secretsList.length === 0 && (
                    <div className="px-5 py-8 text-sm text-muted-foreground">No secrets in this vault.</div>
                  )}
                </div>
              </section>
            </section>
          </div>

          <div className="space-y-6">
            <section className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">Pending for me</h2>
                <Link href="/dashboard/organizations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Review
                </Link>
              </div>
              <div className="divide-y divide-border">
                {myInvitations?.slice(0, 4).map((invite) => (
                  <Link
                    key={invite.id}
                    href={`/invite?token=${invite.token}`}
                    className="block px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <p className="text-sm font-medium text-foreground">{invite.organizationName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invite.roleName || "Member"} • expires {formatDate(invite.expiresAt)}
                    </p>
                  </Link>
                ))}
                {!myInvitations?.length && (
                  <div className="px-5 py-8 text-sm text-muted-foreground">No pending invitations.</div>
                )}
              </div>
            </section>

            <section className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">Pending from this org</h2>
                <Link href="/dashboard/organizations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Manage
                </Link>
              </div>
              <div className="divide-y divide-border">
                {permissions.canReadInvitations && outboundInvitations.slice(0, 5).map((invite) => (
                  <div key={invite.id} className="px-5 py-4">
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invite.roleName || "Member"} • {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                ))}
                {permissions.canReadInvitations && outboundInvitations.length === 0 && (
                  <div className="px-5 py-8 text-sm text-muted-foreground">No pending outbound invitations.</div>
                )}
                {!permissions.canReadInvitations && (
                  <div className="px-5 py-8 text-sm text-muted-foreground">Invitation visibility requires admin access.</div>
                )}
              </div>
            </section>

            <section className="border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Audit scope</p>
                  <p className="text-sm text-muted-foreground">{currentOrganization.name} • {selectedVault.name}</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
