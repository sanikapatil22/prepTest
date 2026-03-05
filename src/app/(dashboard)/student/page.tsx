import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { isStudentEligible } from "@/lib/test-eligibility";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";

export default async function StudentDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as {
    id: string;
    name: string;
    email: string;
    role: string;
    collegeId: string | null;
  };

  if (user.role !== "STUDENT" || !user.collegeId) {
    redirect("/login");
  }

  const [allUpcomingTests, completedAttempts, allAttempts, studentData] =
    await Promise.all([
      prisma.test.findMany({
        where: {
          status: "PUBLISHED",
          drive: { collegeId: user.collegeId },
          attempts: {
            none: { studentId: user.id },
          },
        },
        include: {
          drive: {
            select: { title: true, companyName: true },
          },
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.testAttempt.count({
        where: {
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
      }),
      prisma.testAttempt.findMany({
        where: {
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
          percentage: { not: null },
        },
        select: { percentage: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, departmentId: true, semester: true },
      }),
    ]);

  // Filter tests by eligibility
  const eligibleTests = studentData
    ? allUpcomingTests.filter((test) => isStudentEligible(test, studentData))
    : allUpcomingTests;
  const availableTests = eligibleTests.length;
  const upcomingTests = eligibleTests.slice(0, 5);

  const averageScore =
    allAttempts.length > 0
      ? Math.round(
          allAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
            allAttempts.length
        )
      : 0;

  const stats = [
    {
      title: "Available Tests",
      value: availableTests,
      icon: ClipboardList,
      description: "Tests waiting for you",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Completed Tests",
      value: completedAttempts,
      icon: CheckCircle,
      description: "Tests you have finished",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Average Score",
      value: `${averageScore}%`,
      icon: TrendingUp,
      description:
        allAttempts.length > 0
          ? `Across ${allAttempts.length} test${allAttempts.length !== 1 ? "s" : ""}`
          : "No tests completed yet",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is an overview of your test activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 md:grid-cols-3">
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

      {/* Upcoming Tests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Tests</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/tests">
              View All <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingTests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tests available right now.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium leading-none">
                      {test.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {test.drive.title}
                      {test.drive.companyName
                        ? `\u00a0\u2013\u00a0${test.drive.companyName}`
                        : ""}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" />
                      <span>{test.durationMinutes}&nbsp;min</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{test._count.questions}&nbsp;questions</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{test.totalMarks}&nbsp;marks</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    asChild
                    className="ml-3 shrink-0"
                  >
                    <Link
                      href={`/test/${test.id}/attempt`}
                      aria-label={`Start test: ${test.title}`}
                    >
                      Start
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
