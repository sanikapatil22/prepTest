"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  ClipboardList,
  FileText,
  BarChart3,
  Settings,
  Menu,
  Briefcase,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navMap: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Colleges", href: "/admin/colleges", icon: Building2 },
    { title: "Users", href: "/admin/users", icon: Users },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
  COLLEGE_ADMIN: [
    { title: "Dashboard", href: "/college", icon: LayoutDashboard },
    { title: "Drives", href: "/college/drives", icon: Briefcase },
    { title: "Students", href: "/college/students", icon: GraduationCap },
    { title: "Departments", href: "/college/departments", icon: Building2 },
    { title: "Settings", href: "/college/settings", icon: Settings },
  ],
  STUDENT: [
    { title: "Dashboard", href: "/student", icon: LayoutDashboard },
    { title: "Drives", href: "/student/drives", icon: Briefcase },
    { title: "Tests", href: "/student/tests", icon: ClipboardList },
    { title: "Results", href: "/student/results", icon: BarChart3 },
    { title: "Settings", href: "/student/settings", icon: Settings },
  ],
};

export function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navItems = navMap[role] || [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex items-center h-16 px-6 border-b">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <FileText className="size-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-bold">PrepZero</span>
          </Link>
        </div>
        <nav className="px-3 py-4 space-y-1">
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
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
