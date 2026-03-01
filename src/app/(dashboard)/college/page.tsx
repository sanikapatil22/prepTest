import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, ClipboardList, Users, CheckCircle } from "lucide-react";

export default async function CollegeDashboardPage() {
  const session = await getSession();
  const user = session!.user as { id: string; collegeId: string };
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your college placement activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
