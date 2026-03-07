import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { buildEligibleStudentsWhere } from "@/lib/test-eligibility";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft } from "lucide-react";
import { RetakeButton } from "./retake-button";
import { format } from "date-fns";

export default async function TestResultsPage({
  params,
}: {
  params: Promise<{ driveId: string; testId: string }>;
}) {
  const { driveId, testId } = await params;
  const session = await getSession();

  if (!session) redirect("/login");

  const user = session.user as {
    id: string;
    role: string;
    collegeId: string;
  };

  // Verify the test belongs to the college admin's college
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      drive: {
        select: { id: true, title: true, collegeId: true },
      },
    },
  });

  if (!test || test.drive.collegeId !== user.collegeId) {
    redirect("/college/drives");
  }

  const [attempts, eligibleStudents] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { testId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: buildEligibleStudentsWhere(test, user.collegeId),
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const attemptStudentIds = new Set(attempts.map((a) => a.studentId));
  const absentStudents = eligibleStudents.filter(
    (s) => !attemptStudentIds.has(s.id)
  );

  function formatDuration(seconds: number | null): string {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/college/drives/${driveId}/tests/${testId}`}>
            <ArrowLeft />
            Back to Test
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Test Results</h1>
        <p className="text-muted-foreground">
          Results for <span className="font-medium">{test.title}</span> in{" "}
          <span className="font-medium">{test.drive.title}</span>.
        </p>
      </div>

      <div className="rounded-lg border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Total Marks</TableHead>
              <TableHead className="text-center">Percentage</TableHead>
              <TableHead>Time Taken</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead className="text-center">Violations</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.length === 0 && absentStudents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="h-24 text-center text-muted-foreground"
                >
                  No attempts yet. Students have not taken this test.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {attempts.map((attempt) => {
                  const passed =
                    test.passingMarks > 0 &&
                    attempt.score !== null &&
                    attempt.score >= test.passingMarks;
                  const failed =
                    test.passingMarks > 0 &&
                    attempt.score !== null &&
                    attempt.score < test.passingMarks;

                  return (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">
                        {attempt.student.name}
                      </TableCell>
                      <TableCell>{attempt.student.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            attempt.status === "SUBMITTED"
                              ? "default"
                              : attempt.status === "TIMED_OUT"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {attempt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.score !== null
                          ? attempt.score
                          : "--"}
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.totalMarks !== null
                          ? attempt.totalMarks
                          : "--"}
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.percentage !== null
                          ? `${attempt.percentage.toFixed(1)}%`
                          : "--"}
                      </TableCell>
                      <TableCell>
                        {formatDuration(attempt.timeTakenSeconds)}
                      </TableCell>
                      <TableCell>
                        {attempt.submittedAt
                          ? format(
                              new Date(attempt.submittedAt),
                              "MMM d, yyyy HH:mm"
                            )
                          : "--"}
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.totalViolations > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  variant="destructive"
                                  className="cursor-help"
                                >
                                  {attempt.totalViolations}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p>Tab switches: {attempt.tabSwitchCount}</p>
                                  <p>Fullscreen exits: {attempt.fullscreenExitCount}</p>
                                  <p>Copy/paste attempts: {attempt.copyPasteAttempts}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                        {attempt.autoSubmitted && (
                          <Badge variant="outline" className="ml-1 text-xs border-red-300 text-red-600">
                            Auto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {attempt.status !== "SUBMITTED" &&
                        attempt.status !== "TIMED_OUT" ? (
                          <Badge variant="outline">Pending</Badge>
                        ) : passed ? (
                          <Badge variant="default">Pass</Badge>
                        ) : failed ? (
                          <Badge variant="destructive">Fail</Badge>
                        ) : (
                          <Badge variant="outline">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(attempt.status === "SUBMITTED" ||
                          attempt.status === "TIMED_OUT") && (
                          <RetakeButton
                            attemptId={attempt.id}
                            studentName={attempt.student.name}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {absentStudents.map((student) => (
                  <TableRow key={student.id} className="bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">
                      {student.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-amber-300 text-amber-700"
                      >
                        ABSENT
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      --
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      --
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      --
                    </TableCell>
                    <TableCell className="text-muted-foreground">--</TableCell>
                    <TableCell className="text-muted-foreground">--</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      --
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-amber-300 text-amber-700"
                      >
                        Absent
                      </Badge>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
