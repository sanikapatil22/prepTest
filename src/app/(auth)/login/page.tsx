"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });

      if (result.error) {
        toast.error(result.error.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/get-session");
      const session = await res.json();
      const role = session?.user?.role;

      switch (role) {
        case "SUPER_ADMIN":
          router.push("/admin");
          break;
        case "COLLEGE_ADMIN":
          router.push("/college");
          break;
        case "STUDENT":
          router.push("/student");
          break;
        default:
          router.push("/");
      }
    } catch {
      toast.error("An error occurred during login");
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-md border-border/60">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                spellCheck={false}
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">
                New here?
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full text-sm">
            <Link
              href="/register"
              className="flex flex-col items-center rounded-lg border border-border/60 px-3 py-2.5 text-center hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-foreground text-xs">College Admin</span>
              <span className="text-xs text-muted-foreground mt-0.5">Register here</span>
            </Link>
            <Link
              href="/register/student"
              className="flex flex-col items-center rounded-lg border border-border/60 px-3 py-2.5 text-center hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-foreground text-xs">Student</span>
              <span className="text-xs text-muted-foreground mt-0.5">Register here</span>
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
