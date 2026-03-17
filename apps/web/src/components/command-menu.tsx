"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  LayoutDashboard,
  Lock,
  LogOut,
  Moon,
  Plus,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sun,
  Users,
  Vault,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogout } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { useRBAC } from "@/hooks/use-rbac";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { theme, setTheme } = useTheme();
  const permissions = useRBAC();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = useCallback(
    (fn: () => void) => {
      setOpen(false);
      fn();
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[520px] gap-0 overflow-hidden p-0 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.25)]">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList className="max-h-80">
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => run(() => router.push("/dashboard"))}>
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/dashboard/organizations"))}>
                <Users className="h-4 w-4" />
                Teams
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/dashboard/keys"))}>
                <Key className="h-4 w-4" />
                Keys
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/dashboard/secrets"))}>
                <Lock className="h-4 w-4" />
                Secrets
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/dashboard/vaults"))}>
                <Vault className="h-4 w-4" />
                Vaults
              </CommandItem>
              {permissions.canReadPolicies ? (
                <CommandItem onSelect={() => run(() => router.push("/dashboard/policies"))}>
                  <Shield className="h-4 w-4" />
                  Policies
                </CommandItem>
              ) : null}
              <CommandItem onSelect={() => run(() => router.push("/dashboard/audit"))}>
                <ScrollText className="h-4 w-4" />
                Audit
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/dashboard/settings"))}>
                <Settings className="h-4 w-4" />
                Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              {permissions.canCreateKey ? (
                <CommandItem onSelect={() => run(() => router.push("/dashboard/keys"))}>
                  <Plus className="h-4 w-4" />
                  Create key
                </CommandItem>
              ) : null}
              {permissions.canCreateSecret ? (
                <CommandItem onSelect={() => run(() => router.push("/dashboard/secrets"))}>
                  <Plus className="h-4 w-4" />
                  Create secret
                </CommandItem>
              ) : null}
              {permissions.canCreateVault ? (
                <CommandItem onSelect={() => run(() => router.push("/dashboard/vaults"))}>
                  <Plus className="h-4 w-4" />
                  Create vault
                </CommandItem>
              ) : null}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Preferences">
              <CommandItem onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Toggle theme
                <CommandShortcut>Theme</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(() => logout())}>
                <LogOut className="h-4 w-4" />
                Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
