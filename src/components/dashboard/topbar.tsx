"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, Settings } from "lucide-react";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const roleMeta: Record<
  string,
  { label: string; variant: "destructive" | "default" | "secondary" }
> = {
  SUPER_ADMIN:   { label: "Super Admin",   variant: "destructive" },
  COLLEGE_ADMIN: { label: "College Admin", variant: "default"     },
  STUDENT:       { label: "Student",       variant: "secondary"   },
};

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const role = roleMeta[user.role] ?? { label: user.role, variant: "secondary" as const };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <MobileNav role={user.role} />
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative size-9 rounded-full"
            aria-label="Open user menu"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-64">
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex flex-col gap-1">
                <p className="truncate text-sm font-medium leading-none">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <Badge
                  variant={role.variant}
                  className="mt-0.5 w-fit px-1.5 py-0 text-[10px]"
                >
                  {role.label}
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href={
                user.role === "SUPER_ADMIN"
                  ? "/admin/settings"
                  : user.role === "COLLEGE_ADMIN"
                    ? "/college/settings"
                    : "/student/settings"
              }
            >
              <Settings className="mr-2 size-4" aria-hidden="true" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
