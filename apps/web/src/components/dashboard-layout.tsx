"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { name: "Audit", href: "/dashboard/audit", icon: ScrollText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentOrganization, currentVault } = useOrganizationStore();
  const permissions = useRBAC();
  const { mutate: logout } = useLogout();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();
  const visibleNavigation = navigation.filter((item) =>
    !item.requires || permissions[item.requires],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={toggleSidebar}
            aria-label="Close navigation"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex h-screen w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:transition-[width]",
            sidebarOpen ? "translate-x-0 lg:w-[248px]" : "-translate-x-full lg:translate-x-0 lg:w-[76px]",
          )}
        >
          <div className="flex h-full flex-col">
            <div
              className={cn(
                "border-b border-sidebar-border",
                sidebarOpen
                  ? "flex items-center justify-between gap-3 px-4 py-4"
                  : "flex flex-col items-center gap-3 px-2 py-3",
              )}
            >
              <Link
                href="/dashboard"
                className={cn(
                  "flex min-w-0 items-center gap-3",
                  !sidebarOpen && "justify-center",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-border bg-background">
                  <Logo className="h-4 w-4 text-foreground" />
                </span>
                {sidebarOpen ? (
                  <span className="truncate text-sm font-semibold text-foreground">
                    Hermes
                  </span>
                ) : null}
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", !sidebarOpen && "hidden")}
                onClick={toggleSidebar}
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>

              {!sidebarOpen ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleSidebar}
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {sidebarOpen ? (
              <div className="border-b border-sidebar-border px-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Organization
                    </p>
                    <OrganizationSelector />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Vault
                    </p>
                    <VaultSelector
                      onCreateNew={
                        permissions.canCreateVault
                          ? () => router.push("/dashboard/vaults")
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <nav className="flex-1 px-3 py-4">
              <div className="space-y-1">
                {visibleNavigation.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
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

            <div className="border-t border-sidebar-border px-3 py-4">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2",
                  !sidebarOpen && "justify-center px-0",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {user?.firstName?.[0] ||
                    user?.email?.[0]?.toUpperCase() ||
                    "O"}
                </div>
                {sidebarOpen ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user?.firstName || user?.lastName
                        ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                        : user?.username || "Operator"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                ) : null}
              </div>
              <Button
                variant="ghost"
                className={cn(
                  "mt-2 h-9 w-full text-muted-foreground hover:text-foreground",
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

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-2 lg:hidden">
                  <Link
                    href="/dashboard"
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-background"
                    aria-label="Go to dashboard"
                  >
                    <Logo className="h-4 w-4 text-foreground" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={toggleSidebar}
                    aria-label="Toggle navigation"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>

                <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Current Scope
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                  {currentOrganization?.name || "No organization selected"}
                  {currentVault ? ` / ${currentVault.name}` : ""}
                </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative hidden md:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search"
                    className="h-9 w-52 pl-9 pr-10 text-sm"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Ctrl K
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
