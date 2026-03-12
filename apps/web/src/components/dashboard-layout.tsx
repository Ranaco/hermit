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
  Search,
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

  const activeTitle = navigation.find((item) => pathname === item.href)?.name || "Hermes";

  return (
    <div className="flex min-h-screen bg-transparent text-foreground p-4 lg:p-6 gap-6 selection:bg-primary/20">
      {/* Floating Sidebar */}
      <aside
        className={cn(
          "sticky top-6 h-[calc(100vh-3rem)] cupertino-glass transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 flex flex-col z-20 overflow-hidden",
          sidebarOpen ? "w-[280px]" : "w-[88px]"
        )}
      >
        <div className="flex h-full flex-col p-5 gap-4">
          <div className="flex items-center justify-between px-1 py-1">
            <div className={cn("flex items-center gap-3 transition-opacity duration-300", sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")}> 
              <div className="w-10 h-10 rounded-2xl bg-primary flex shrink-0 items-center justify-center text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-white/10 glow">
                <Logo className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight leading-none text-foreground">Hermes</h1>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">Workspace</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-10 w-10 rounded-2xl shrink-0 transition-colors hover:bg-black/5 dark:hover:bg-white/10", !sidebarOpen && "mx-auto")}
              onClick={toggleSidebar}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-[18px] w-[18px] text-foreground" /> : <Menu className="h-[18px] w-[18px] text-foreground" />}
            </Button>
          </div>

          <div className={cn("space-y-3 px-1 mt-4 transition-all duration-300 transform", sidebarOpen ? "opacity-100 translate-y-0 block" : "opacity-0 -translate-y-2 hidden")}>
            <OrganizationSelector onCreateNew={() => router.push("/dashboard/organizations")} />
            <VaultSelector onCreateNew={() => router.push("/dashboard/vaults")} />
          </div>

          <nav className="flex-1 space-y-1.5 mt-4">
            <div className={cn("px-4 mb-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest transition-opacity", !sidebarOpen && "opacity-0")}>Menu</div>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3.5 rounded-[16px] px-3.5 py-3 text-sm font-[600] transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-x-1"
                      : "text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-[20px] w-[20px] shrink-0 transition-colors duration-300", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className={cn("truncate transition-all duration-300", sidebarOpen ? "opacity-100 block" : "opacity-0 hidden")}>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-4 pt-4 mt-auto">
            <div className={cn("flex items-center gap-3 px-2 transition-all duration-300", sidebarOpen ? "opacity-100 block" : "opacity-0 hidden")}>
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-chart-3 shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-background">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "O"}
               </div>
               <div className="flex flex-col min-w-0">
                 <p className="text-sm font-bold truncate text-foreground">
                   {user?.firstName || user?.lastName
                     ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                     : user?.username || "Operator"}
                 </p>
                 <p className="text-[11px] font-medium text-muted-foreground truncate">{user?.email}</p>
               </div>
            </div>
            
            <Button
              variant="ghost"
              className={cn("w-full h-12 rounded-[16px] text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors", sidebarOpen ? "justify-start px-4" : "justify-center")}
              onClick={() => logout()}
            >
              <LogOut className="h-[20px] w-[20px]" />
              {sidebarOpen && <span className="ml-3 font-semibold">Sign Out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col z-10 w-full overflow-hidden">
        {/* Floating Header */}
        <header className="sticky top-6 relative z-30 mb-8 cupertino-glass-panel !rounded-[24px] !py-3 !px-5 flex h-[72px] shrink-0 items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-[22px] font-bold tracking-tight text-foreground">{activeTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search resources..."
                className="h-11 w-72 rounded-full border-black/[0.05] bg-black/[0.03] pl-11 pr-14 text-[14px] font-medium shadow-none transition-all duration-300 placeholder:text-muted-foreground focus:bg-white/50 focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-white/[0.05] dark:bg-white/[0.04] dark:focus:bg-black/20"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-[10px] font-bold text-muted-foreground bg-black/5 dark:bg-white/10 rounded-[6px] px-1.5 py-0.5 border border-black/5 dark:border-white/5 shadow-sm">⌘K</span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-black/10 dark:bg-white/10 mx-1 hidden sm:block"></div>
            
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.05] transition-all duration-300">
              <Bell className="h-4 w-4 text-foreground/80" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.05] transition-all duration-300"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-foreground/80" /> : <Moon className="h-4 w-4 text-foreground/80" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 w-full pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
