"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Shield, User, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="kms-panel">
          <h1 className="kms-title">Settings</h1>
          <p className="kms-subtitle mt-2">
            Control account profile, authentication posture, and operational notifications.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="kms-surface border-border/80">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-lg tracking-tight">
                <User className="h-4 w-4 text-blue-600" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="jane@company.com" />
                </div>
              </div>
              <Button>Save Profile</Button>
            </CardContent>
          </Card>

          <Card className="kms-surface border-border/80">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-lg tracking-tight">
                <Shield className="h-4 w-4 text-indigo-600" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-md">
                  <KeyRound className="mr-1 h-3 w-3" />
                  MFA recommended
                </Badge>
                <Badge variant="outline" className="rounded-md">
                  Session timeout: 30m
                </Badge>
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="kms-surface border-border/80">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-lg tracking-tight">
                <Bell className="h-4 w-4 text-emerald-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
                <span>Security alerts</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
                <span>Key rotation reminders</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm">
                <span>Secret access anomalies</span>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="kms-surface border-border/80">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">Operational Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
                Secret values remain masked by default and reveal operations should always be audited.
              </p>
              <p className="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
                Prefer team-scoped permissions over direct user grants for safer long-term access control.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
