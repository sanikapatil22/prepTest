import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  ClipboardList,
  Users,
  CheckCircle,
  Plus,
  Upload,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function CollegeDashboardPage() {
  const session = await getSession();
  const user = session!.user as { id: string; name: string; collegeId: string };
  const collegeId = user.collegeId;

  const [driveCount, testCount, studentCount, activeTestCount] =
    await Promise.all([
      prisma.placementDrive.count({ where: { collegeId } }),
      prisma.test.count({
        where: { drive: { collegeId } },
      }),
      prisma.user.count({
        where: { collegeId, role: "STUDENT" },
      }),
      prisma.test.count({
        where: { drive: { collegeId }, status: "PUBLISHED" },
      }),
    ]);

  const stats = [
    {
      title: "Total Drives",
      value: driveCount,
      icon: Briefcase,
      description: "Placement drives created",
    },
    {
      title: "Total Tests",
      value: testCount,
      icon: ClipboardList,
      description: "Tests across all drives",
    },
    {
      title: "Total Students",
      value: studentCount,
      icon: Users,
      description: "Registered students",
    },
    {
      title: "Active Tests",
      value: activeTestCount,
      icon: CheckCircle,
      description: "Published and available",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your college placement activities.
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
              <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                <stat.icon
                  className="size-4 text-primary"
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
            <Link href="/college/drives/new">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Create Drive
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/college/students/upload">
              <Upload className="mr-2 size-4" aria-hidden="true" />
              Import Students
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/college/drives">
              <Briefcase className="mr-2 size-4" aria-hidden="true" />
              View Drives
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
