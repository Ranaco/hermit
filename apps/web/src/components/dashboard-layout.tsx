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
  Key,
  Lock,
  Vault,
  Users,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Building2,
} from "lucide-react";
import { useTheme } from "next-themes";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Organizations", href: "/dashboard/organizations", icon: Building2 },
  { name: "Keys", href: "/dashboard/keys", icon: Key },
  { name: "Secrets", href: "/dashboard/secrets", icon: Lock },
  { name: "Vaults", href: "/dashboard/vaults", icon: Vault },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r-2 border-border bg-sidebar transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 md:w-20"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b-2 border-border px-4">
          {sidebarOpen ? (
            <h1 className="text-2xl font-bold text-primary">Hermes</h1>
          ) : (
            <div className="hidden md:block text-2xl font-bold text-primary">H</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium border-2 transition-all hover:shadow-sm",
                  isActive
                    ? "bg-primary text-primary-foreground border-border shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Context Selectors */}
        {sidebarOpen && (
          <div className="border-t-2 border-border p-4 space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Context
              </p>
              <OrganizationSelector 
                onCreateNew={() => router.push("/dashboard/organizations")}
              />
              <VaultSelector 
                onCreateNew={() => router.push("/dashboard/vaults")}
              />
            </div>
          </div>
        )}

        {/* User Section */}
        <div className="border-t-2 border-border p-4 space-y-2">
          {sidebarOpen && user && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">
                {user.firstName || user.lastName
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : user.username || user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size={sidebarOpen ? "default" : "icon"}
            className="w-full justify-start"
            onClick={() => logout()}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b-2 border-border bg-card px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="shadow-sm"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold">
              {navigation.find((item) => pathname === item.href)?.name || "Hermes KMS"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="shadow-sm"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
