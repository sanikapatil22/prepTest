import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Briefcase, ClipboardList, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await getSession();
  const user = session!.user as { name: string };
  const firstName = user.name.split(" ")[0];

  const [collegeCount, userCount, driveCount, testCount] = await Promise.all([
    prisma.college.count(),
    prisma.user.count(),
    prisma.placementDrive.count(),
    prisma.test.count(),
  ]);

  const stats = [
    {
      title: "Total Colleges",
      value: collegeCount,
      icon: Building2,
      description: "Registered institutions",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Users",
      value: userCount,
      icon: Users,
      description: "Students, admins & super admins",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      title: "Total Drives",
      value: driveCount,
      icon: Briefcase,
      description: "Placement drives across colleges",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Total Tests",
      value: testCount,
      icon: ClipboardList,
      description: "Tests created across drives",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your PrepZero platform.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="shadow-sm transition-[shadow,background-color] duration-200 hover:shadow-md hover:bg-accent/40"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`shrink-0 rounded-lg p-2.5 ${stat.iconBg}`}>
                <stat.icon
                  className={`size-4 ${stat.iconColor}`}
                  aria-hidden="true"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/colleges/new">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Add College
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/users">
              <Users className="mr-2 size-4" aria-hidden="true" />
              Manage Users
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/colleges">
              <Building2 className="mr-2 size-4" aria-hidden="true" />
              View Colleges
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
