"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/hooks/use-auth";
import { useUIStore } from "@/store/ui.store";
import { useOrganizationStore } from "@/store/organization.store";
import { useRBAC } from "@/hooks/use-rbac";
import { OrganizationSelector } from "@/components/organization-selector";
import { VaultSelector } from "@/components/vault-selector";
import {
  Key,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sun,
  Users,
  Vault,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import { CommandMenu } from "@/components/command-menu";
import { AmbientParallax } from "@/components/ambient-parallax";

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  requires?: "canReadPolicies";
};

const navigation: NavigationItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Teams", href: "/dashboard/organizations", icon: Users },
  { name: "Keys", href: "/dashboard/keys", icon: Key },
  { name: "Secrets", href: "/dashboard/secrets", icon: Lock },
  { name: "Vaults", href: "/dashboard/vaults", icon: Vault },
  { name: "Policies", href: "/dashboard/policies", icon: Shield, requires: "canReadPolicies" },
  { name: "Graph", href: "/dashboard/graph", icon: Network, requires: "canReadPolicies" },
  { name: "Audit", href: "/dashboard/audit", icon: ScrollText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({
  children,
  fullWidth = false,
  contentClassName,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentOrganization, currentVault } = useOrganizationStore();
  const permissions = useRBAC();
  const { mutate: logout } = useLogout();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();

  const visibleNavigation = navigation.filter((item) => !item.requires || permissions[item.requires]);
  const operatorInitial = user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "O";
  const operatorName =
    user?.firstName || user?.lastName
      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
      : user?.username || "Operator";

  const currentScope = currentOrganization?.name || "No organization selected";
  const currentLocation = currentVault ? `${currentScope} / ${currentVault.name}` : currentScope;

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  return (
    <div className="hermit-shell min-h-screen bg-background text-foreground">
      <AmbientParallax
        layers={[
          {
            className:
              "left-[22rem] top-[6.5rem] hidden h-16 w-28 rounded-full border border-border/60 bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(123,166,162,0.12),rgba(255,255,255,0.04))] lg:block",
            depth: 0.2,
            travel: 10,
          },
          {
            className:
              "right-[4%] top-[9rem] hidden h-18 w-18 rounded-[24px] border border-border/60 bg-[linear-gradient(180deg,rgba(241,221,198,0.14),rgba(255,255,255,0.03))] lg:block",
            depth: 0.28,
            travel: 12,
          },
        ]}
      />
      <div className="relative z-10 flex min-h-screen">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={toggleSidebar}
            aria-label="Close navigation"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-3 left-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-[30px] border border-sidebar-border/80 bg-sidebar/92 shadow-[0_28px_90px_-55px_rgba(8,6,5,0.7)] backdrop-blur-xl transition-transform duration-200 hermit-enter-soft lg:sticky lg:inset-y-4 lg:left-4 lg:h-[calc(100vh-2rem)] lg:w-[292px] lg:translate-x-0 lg:self-start",
            sidebarOpen ? "translate-x-0" : "-translate-x-[120%] lg:w-[92px]",
          )}
        >
          <div className="flex h-full flex-col">
            <div
              className={cn(
                "border-b border-sidebar-border/80",
                sidebarOpen
                  ? "flex items-center justify-between gap-3 px-5 py-5"
                  : "flex flex-col items-center gap-3 px-3 py-4",
              )}
            >
              <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-3", !sidebarOpen && "justify-center")}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/85 shadow-[0_14px_26px_-20px_rgba(39,28,17,0.35)]">
                  <Logo className="h-5 w-5 text-foreground" />
                </span>
                {sidebarOpen ? (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">Hermit</span>
                    <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">sealed relay</span>
                  </span>
                ) : null}
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", !sidebarOpen && "hidden")}
                onClick={toggleSidebar}
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>

              {!sidebarOpen ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={toggleSidebar}
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {sidebarOpen ? (
              <div className="space-y-4 border-b border-sidebar-border/80 px-5 py-5">
                <div className="rounded-[22px] border border-border/80 bg-background/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Organization</p>
                  <div className="mt-2">
                    <OrganizationSelector />
                  </div>
                </div>
                <div className="rounded-[22px] border border-border/80 bg-background/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Vault</p>
                  <div className="mt-2">
                    <VaultSelector
                      onCreateNew={permissions.canCreateVault ? () => router.push("/dashboard/vaults") : undefined}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <nav className="flex-1 px-3 py-5">
              <div className="space-y-1.5">
                {visibleNavigation.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground shadow-[0_20px_34px_-28px_rgba(39,28,17,0.55)]"
                          : "text-muted-foreground hover:bg-sidebar-accent/80 hover:text-foreground",
                        !sidebarOpen && "justify-center px-0",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen ? <span>{item.name}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-sidebar-border/80 px-3 py-4">
              <div
                className={cn(
                  "rounded-[22px] border border-border/80 bg-background/62 px-3 py-3",
                  !sidebarOpen && "flex justify-center border-none bg-transparent px-0 py-0",
                )}
              >
                <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                    {operatorInitial}
                  </div>
                  {sidebarOpen ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{operatorName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <Button
                variant="ghost"
                className={cn(
                  "mt-2 h-10 w-full text-muted-foreground hover:text-foreground",
                  sidebarOpen ? "justify-start px-3" : "justify-center px-0",
                )}
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                {sidebarOpen ? <span>Sign out</span> : null}
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-6">
          <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4 lg:px-4">
            <div className="rounded-[28px] border border-border/80 bg-background/78 shadow-[0_20px_60px_-42px_rgba(39,28,17,0.32)] backdrop-blur-xl hermit-enter-soft">
              <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex items-center gap-2 lg:hidden">
                    <Link
                      href="/dashboard"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/85"
                      aria-label="Go to dashboard"
                    >
                      <Logo className="h-4 w-4 text-foreground" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={toggleSidebar}
                      aria-label="Toggle navigation"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current scope</p>
                    <p className="truncate text-sm font-medium text-foreground">{currentLocation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
                    }
                    className="hidden h-10 w-56 items-center gap-2 rounded-full border border-border/85 bg-background/82 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/70 md:inline-flex"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Search commands or pages</span>
                    <kbd className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Ctrl K
                    </kbd>
                  </button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main
            className={cn(
              "w-full px-3 pb-8 pt-5 sm:px-4 lg:px-4",
              fullWidth ? "mx-0 max-w-none" : "mx-auto max-w-[1320px]",
              contentClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>

      <CommandMenu />
    </div>
  );
}
