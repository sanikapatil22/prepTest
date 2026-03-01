"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  semester: number | null;
  college: { name: string } | null;
  department: { name: string; code: string | null } | null;
  createdAt: string;
}

export default function StudentSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [semester, setSemester] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/students/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data: ProfileData = await res.json();
        setProfile(data);
        setName(data.name);
        setSemester(data.semester ? String(data.semester) : "");
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/students/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          semester: semester ? parseInt(semester, 10) : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const data: ProfileData = await res.json();
      setProfile(data);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        throw new Error(error.message || "Failed to change password");
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password"
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          View and update your profile information.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Some fields are managed by your college admin and cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Read-only fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">USN</Label>
              <p className="text-sm font-medium font-mono">
                {profile.usn || <span className="text-muted-foreground">&mdash;</span>}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">College</Label>
              <p className="text-sm font-medium">
                {profile.college?.name || <span className="text-muted-foreground">&mdash;</span>}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Department</Label>
              <p className="text-sm font-medium">
                {profile.department ? (
                  <>
                    {profile.department.name}
                    {profile.department.code && (
                      <Badge variant="outline" className="ml-2">
                        {profile.department.code}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Current Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger id="semester" className="w-full sm:w-48">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password. You will be signed out of other sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="pt-4">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword && <Loader2 className="animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
