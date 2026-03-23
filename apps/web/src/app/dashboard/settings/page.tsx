"use client";

import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2, Shield, User } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { useUpdateProfile, useChangePassword } from "@/hooks/use-user";
import { toast } from "sonner";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mutate: updateProfile, isPending: isSavingProfile } = useUpdateProfile();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ firstName: firstName || undefined, lastName: lastName || undefined });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[58ch]">
            <p className="app-eyebrow">Account</p>
            <h1 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Profile, password, and defaults.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              <Fingerprint className="mr-1.5 h-3.5 w-3.5" />
              MFA recommended
            </Badge>
            <Badge variant="outline">Session timeout: 30m</Badge>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="inline-flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile and authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <p className="app-section-title">Profile</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      value={firstName}
                      autoComplete="given-name"
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      autoComplete="family-name"
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    autoComplete="email"
                    disabled
                    className="opacity-60"
                  />
                </div>

                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save profile
                </Button>
              </form>

              <form onSubmit={handleChangePassword} className="space-y-4 border-t border-border pt-8">
                <div>
                  <p className="app-section-title">Password</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Reveal prompts stay separate.</p>
                </div>

                <input
                  type="email"
                  name="account-email"
                  value={user?.email || ""}
                  autoComplete="username"
                  readOnly
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                />

                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    name="current-password"
                    type="password"
                    value={currentPassword}
                    autoComplete="current-password"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      name="new-password"
                      type="password"
                      minLength={8}
                      placeholder="Min 8 characters"
                      value={newPassword}
                      autoComplete="new-password"
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="outline" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border">
                <CardTitle className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Operating defaults
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="border-b border-border pb-4">
                  <p className="text-sm font-medium text-foreground">Sensitive values stay masked</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Reveal stays deliberate.
                  </p>
                </div>
                <div className="border-b border-border pb-4">
                  <p className="text-sm font-medium text-foreground">Prefer team-based grants</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Team roles are easier to manage.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Session posture</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Short sessions reduce ambient access.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border">
                <CardTitle>Current posture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {[
                  ["MFA coverage", "Recommended"],
                  ["Secret reveal auditing", "Enabled"],
                  ["Security alerts", "Enabled"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-border py-2 last:border-b-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
