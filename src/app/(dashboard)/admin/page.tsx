import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Briefcase, ClipboardList } from "lucide-react";

export default async function AdminDashboardPage() {
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
    },
    {
      title: "Total Users",
      value: userCount,
      icon: Users,
      description: "Students, admins & super admins",
    },
    {
      title: "Total Drives",
      value: driveCount,
      icon: Briefcase,
      description: "Placement drives across colleges",
    },
    {
      title: "Total Tests",
      value: testCount,
      icon: ClipboardList,
      description: "Tests created across drives",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your PrepZero platform.
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
