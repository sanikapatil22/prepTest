import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { isStudentEligible } from "@/lib/test-eligibility";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
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
  Clock,
  Play,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

export default async function StudentTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ driveId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as {
    id: string;
    role: string;
    collegeId: string | null;
  };

  if (user.role !== "STUDENT" || !user.collegeId) {
    redirect("/login");
  }

  const { driveId } = await searchParams;

  // Build where clause
  const whereClause: Record<string, unknown> = {
    status: "PUBLISHED",
    drive: { collegeId: user.collegeId },
  };
  if (driveId) {
    whereClause.driveId = driveId;
  }

  const [allTests, studentData] = await Promise.all([
    prisma.test.findMany({
      where: whereClause,
      include: {
        drive: {
          select: { id: true, title: true, companyName: true },
        },
        _count: { select: { questions: true } },
        attempts: {
          where: { studentId: user.id },
          select: { id: true, status: true, percentage: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, departmentId: true, semester: true },
    }),
  ]);

  const tests = studentData
    ? allTests.filter((test) => isStudentEligible(test, studentData))
    : allTests;

  // Optionally get the drive name if filtering
  let driveTitle: string | null = null;
  if (driveId) {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      select: { title: true },
    });
    driveTitle = drive?.title ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {driveTitle ? `Tests - ${driveTitle}` : "Available Tests"}
        </h1>
        <p className="text-muted-foreground">
          {driveTitle
            ? "Tests for this placement drive."
            : "All published tests available for you."}
        </p>
        {driveId && (
          <Link href="/student/tests">
            <Button variant="link" className="px-0 mt-1">
              View all tests
            </Button>
          </Link>
        )}
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No tests available</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no published tests at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Drive / Company</TableHead>
                  <TableHead className="text-center">Duration</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Total Marks</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => {
                  const attempt = test.attempts[0] ?? null;
                  const isInProgress = attempt?.status === "IN_PROGRESS";
                  const isCompleted =
                    attempt?.status === "SUBMITTED" ||
                    attempt?.status === "TIMED_OUT";

                  return (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div className="font-medium">{test.title}</div>
                        {test.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {test.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{test.drive.title}</div>
                        {test.drive.companyName && (
                          <p className="text-xs text-muted-foreground">
                            {test.drive.companyName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Clock className="size-3.5" />
                          {test.durationMinutes} min
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {test._count.questions}
                      </TableCell>
                      <TableCell className="text-center">
                        {test.totalMarks}
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompleted ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="size-3 mr-1" />
                            Completed
                          </Badge>
                        ) : isInProgress ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <RotateCcw className="size-3 mr-1" />
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Started</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isCompleted ? (
                          <Link href={`/student/results/${attempt.id}`}>
                            <Button variant="outline" size="sm">
                              View Result
                            </Button>
                          </Link>
                        ) : isInProgress ? (
                          <Link href={`/test/${test.id}/attempt`}>
                            <Button size="sm" variant="secondary">
                              <RotateCcw className="size-3.5 mr-1" />
                              Continue
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/test/${test.id}/attempt`}>
                            <Button size="sm">
                              <Play className="size-3.5 mr-1" />
                              Start Test
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
