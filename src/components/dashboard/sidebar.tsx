"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  ClipboardList,
  Zap,
  BarChart3,
  Settings,
  Briefcase,
  BookOpen,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Colleges", href: "/admin/colleges", icon: Building2 },
  { title: "Library", href: "/admin/library", icon: BookOpen },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

const collegeNav: NavItem[] = [
  { title: "Dashboard", href: "/college", icon: LayoutDashboard },
  { title: "Drives", href: "/college/drives", icon: Briefcase },
  { title: "Library", href: "/college/library", icon: BookOpen },
  { title: "Students", href: "/college/students", icon: GraduationCap },
  { title: "Departments", href: "/college/departments", icon: Building2 },
  { title: "Settings", href: "/college/settings", icon: Settings },
];

const studentNav: NavItem[] = [
  { title: "Dashboard", href: "/student", icon: LayoutDashboard },
  { title: "Drives", href: "/student/drives", icon: Briefcase },
  { title: "Tests", href: "/student/tests", icon: ClipboardList },
  { title: "Results", href: "/student/results", icon: BarChart3 },
  { title: "Settings", href: "/student/settings", icon: Settings },
];

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "SUPER_ADMIN":
      return adminNav;
    case "COLLEGE_ADMIN":
      return collegeNav;
    case "STUDENT":
      return studentNav;
    default:
      return [];
  }
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  COLLEGE_ADMIN: "College Admin",
  STUDENT: "Student",
};

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center h-16 px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Zap className="size-4 text-sidebar-primary-foreground" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">PrepZero</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/college" &&
                item.href !== "/student" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon
                  className={cn("size-4 shrink-0", isActive && "text-sidebar-primary")}
                  aria-hidden="true"
                />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent px-3 py-2.5">
          <p className="text-xs text-sidebar-foreground/60">Signed in as</p>
          <p className="text-xs font-medium mt-0.5 text-sidebar-foreground">
            {roleLabel[role] ?? role}
          </p>
        </div>
      </div>
    </div>
  );
}
