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
  FileText,
  BarChart3,
  Settings,
  Briefcase,
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
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

const collegeNav: NavItem[] = [
  { title: "Dashboard", href: "/college", icon: LayoutDashboard },
  { title: "Drives", href: "/college/drives", icon: Briefcase },
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

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
      <div className="flex items-center h-16 px-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">PrepZero</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
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
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
