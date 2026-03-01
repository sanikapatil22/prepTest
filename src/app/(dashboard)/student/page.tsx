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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  // Fetch stats and data in parallel
  const [availableTests, completedAttempts, allAttempts, upcomingTests, recentResults] =
    await Promise.all([
      // Count of published tests from student's college not yet attempted
      prisma.test.count({
        where: {
          status: "PUBLISHED",
          drive: { collegeId: user.collegeId },
          attempts: {
            none: { studentId: user.id },
          },
        },
      }),
      // Count of completed attempts
      prisma.testAttempt.count({
        where: {
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
      }),
      // All submitted attempts for average score
      prisma.testAttempt.findMany({
        where: {
          studentId: user.id,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
          percentage: { not: null },
        },
        select: { percentage: true },
      }),
      // Upcoming tests (published, not attempted)
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
      // Recent results
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your test activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tests</CardTitle>
            <Link href="/student/tests">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingTests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tests available right now.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {test.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {test.drive.title}
                        {test.drive.companyName
                          ? ` - ${test.drive.companyName}`
                          : ""}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {test.durationMinutes} min
                        <span className="mx-1">|</span>
                        {test._count.questions} questions
                        <span className="mx-1">|</span>
                        {test.totalMarks} marks
                      </div>
                    </div>
                    <Link href={`/test/${test.id}/attempt`}>
                      <Button size="sm">Start</Button>
                    </Link>
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
            <Link href="/student/results">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No results yet. Take a test to see your scores here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentResults.map((attempt) => (
                  <Link
                    key={attempt.id}
                    href={`/student/results/${attempt.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {attempt.test.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.test.drive.title}
                        {attempt.test.drive.companyName
                          ? ` - ${attempt.test.drive.companyName}`
                          : ""}
                      </p>
                      {attempt.submittedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(attempt.submittedAt, {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums">
                        {attempt.percentage !== null
                          ? `${Math.round(attempt.percentage)}%`
                          : "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {attempt.score ?? 0}/{attempt.test.totalMarks}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
