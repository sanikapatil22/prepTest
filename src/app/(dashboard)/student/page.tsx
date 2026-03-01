import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const [availableTests, completedAttempts, allAttempts, upcomingTests, recentResults] =
    await Promise.all([
      prisma.test.count({
        where: {
          status: "PUBLISHED",
          drive: { collegeId: user.collegeId },
          attempts: {
            none: { studentId: user.id },
          },
        },
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
        take: 5,
      }),
      prisma.testAttempt.findMany({
        where: {
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        include: {
          test: {
            select: {
              title: true,
              totalMarks: true,
              drive: { select: { title: true, companyName: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
    ]);

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
    },
    {
      title: "Completed Tests",
      value: completedAttempts,
      icon: CheckCircle,
      description: "Tests you have finished",
    },
    {
      title: "Average Score",
      value: `${averageScore}%`,
      icon: TrendingUp,
      description:
        allAttempts.length > 0
          ? `Across ${allAttempts.length} test${allAttempts.length !== 1 ? "s" : ""}`
          : "No tests completed yet",
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

      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Recent Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Results</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/results">
                View All <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No results yet. Take a test to see your scores here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentResults.map((attempt) => {
                  const pct =
                    attempt.percentage !== null
                      ? Math.round(attempt.percentage)
                      : null;
                  const scoreColor =
                    pct === null
                      ? "text-muted-foreground"
                      : pct >= 75
                        ? "text-emerald-600 dark:text-emerald-400"
                        : pct >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400";

                  return (
                    <Link
                      key={attempt.id}
                      href={`/student/results/${attempt.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-medium leading-none">
                          {attempt.test.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {attempt.test.drive.title}
                          {attempt.test.drive.companyName
                            ? `\u00a0\u2013\u00a0${attempt.test.drive.companyName}`
                            : ""}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {attempt.status === "TIMED_OUT" && (
                            <Badge
                              variant="outline"
                              className="h-4 px-1 py-0 text-[10px] text-amber-600 border-amber-300"
                            >
                              Timed out
                            </Badge>
                          )}
                          {attempt.submittedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }).format(new Date(attempt.submittedAt))}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <div
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            scoreColor
                          )}
                        >
                          {pct !== null ? `${pct}%` : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {attempt.score ?? 0}/{attempt.test.totalMarks}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
