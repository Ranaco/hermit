"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/hooks/use-auth";
import { useUIStore } from "@/store/ui.store";
import { OrganizationSelector } from "@/components/organization-selector";
import { VaultSelector } from "@/components/vault-selector";
import {
  LayoutDashboard,
  Users,
  Key,
  Lock,
  Shield,
  ScrollText,
  Vault,
  Settings,
  LogOut,
  Menu,
  PanelLeftClose,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Teams", href: "/dashboard/organizations", icon: Users },
  { name: "Keys", href: "/dashboard/keys", icon: Key },
  { name: "Secrets", href: "/dashboard/secrets", icon: Lock },
  { name: "Vaults", href: "/dashboard/vaults", icon: Vault },
  { name: "Access Policies", href: "/dashboard/policies", icon: Shield },
  { name: "Audit Logs", href: "/dashboard/audit", icon: ScrollText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();

  const activeTitle = navigation.find((item) => pathname === item.href)?.name || "Hermes KMS";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "sticky top-0 h-screen border-r border-sidebar-border bg-sidebar/80 backdrop-blur-md transition-all duration-200",
          sidebarOpen ? "w-[288px]" : "w-[88px]"
        )}
      >
        <div className="flex h-full flex-col p-4 gap-4">
          <div className="flex items-center justify-between px-2 py-2">
            <div className={cn("transition-all", sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")}> 
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hermes</p>
              <h1 className="text-lg font-semibold">Key Management</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={toggleSidebar}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {sidebarOpen ? (
            <div className="space-y-2">
              <OrganizationSelector onCreateNew={() => router.push("/dashboard/organizations")} />
              <VaultSelector onCreateNew={() => router.push("/dashboard/vaults")} />
            </div>
          ) : null}

          <nav className="flex-1 space-y-1 pt-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("truncate", sidebarOpen ? "opacity-100" : "opacity-0 w-0")}>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-sidebar-border pt-3">
            <div className={cn("px-2", sidebarOpen ? "block" : "hidden")}>
              <p className="text-sm font-medium truncate">
                {user?.firstName || user?.lastName
                  ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                  : user?.username || user?.email || "Operator"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size={sidebarOpen ? "default" : "icon"}
              className={cn("w-full rounded-xl", sidebarOpen ? "justify-start" : "justify-center")}
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              {sidebarOpen ? <span className="ml-2">Sign out</span> : null}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h2 className="text-base font-medium tracking-tight">{activeTitle}</h2>
              <p className="text-xs text-muted-foreground">Vault-backed security operations</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
