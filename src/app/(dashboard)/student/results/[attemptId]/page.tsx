import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  Trophy,
  Target,
  Percent,
  Code2,
} from "lucide-react";
import { format } from "date-fns";

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

const LANGUAGE_LABELS: Record<string, string> = {
  PYTHON: "Python",
  JAVA: "Java",
  C: "C",
  CPP: "C++",
};

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as {
    id: string;
    role: string;
    collegeId: string | null;
  };

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
          drive: {
            select: { title: true, companyName: true },
          },
        },
      },
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== user.id) {
    notFound();
  }

  if (attempt.status === "IN_PROGRESS") {
    redirect(`/test/${attempt.testId}/attempt`);
  }

  // Build answer lookup map by questionId
  const answerMap = new Map(
    attempt.answers.map((a) => [a.questionId, a])
  );

  const passed =
    attempt.test.passingMarks > 0 &&
    (attempt.score ?? 0) >= attempt.test.passingMarks;
  const failed =
    attempt.test.passingMarks > 0 &&
    (attempt.score ?? 0) < attempt.test.passingMarks;

  // Stats
  const totalQuestions = attempt.test.questions.length;
  const answeredCount = attempt.answers.filter((a) => {
    if (a.question.questionType === "CODING") {
      return !!a.code;
    }
    return (a.selectedOptionIds as string[]).length > 0;
  }).length;
  const correctCount = attempt.answers.filter((a) => a.isCorrect === true).length;
  const incorrectCount = attempt.answers.filter((a) => {
    if (a.question.questionType === "CODING") {
      return a.isCorrect === false && !!a.code;
    }
    return a.isCorrect === false && (a.selectedOptionIds as string[]).length > 0;
  }).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/student/results">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            {attempt.test.title}
          </h1>
          <p className="text-muted-foreground">
            {attempt.test.drive.title}
            {attempt.test.drive.companyName
              ? ` - ${attempt.test.drive.companyName}`
              : ""}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Score</CardTitle>
            <Trophy className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {attempt.score ?? 0}
              <span className="text-lg text-muted-foreground font-normal">
                /{attempt.test.totalMarks}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Percentage</CardTitle>
            <Percent className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {attempt.percentage !== null
                ? `${Math.round(attempt.percentage)}%`
                : "N/A"}
            </div>
            {passed && (
              <Badge variant="default" className="mt-1 bg-success">
                Passed
              </Badge>
            )}
            {failed && (
              <Badge variant="destructive" className="mt-1">Failed</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Target className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {correctCount}
              <span className="text-lg text-muted-foreground font-normal">
                /{totalQuestions}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incorrectCount} wrong, {unansweredCount} skipped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Time Taken</CardTitle>
            <Clock className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatDuration(attempt.timeTakenSeconds)}
            </div>
            {attempt.submittedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(attempt.submittedAt, "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Question-by-question review */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Question Review</h2>
        <div className="space-y-4">
          {attempt.test.questions.map((question, index) => {
            const answer = answerMap.get(question.id);
            const isCoding = question.questionType === "CODING";
            const selectedIds = answer
              ? (answer.selectedOptionIds as string[])
              : [];
            const correctIds = question.correctOptionIds as string[];
            const options = question.options as Array<{
              id: string;
              text: string;
            }>;

            let wasAnswered: boolean;
            if (isCoding) {
              wasAnswered = !!answer?.code;
            } else {
              wasAnswered = selectedIds.length > 0;
            }
            const isCorrect = answer?.isCorrect === true;

            let statusIcon;
            let statusColor: string;
            let borderColor: string;

            if (!wasAnswered) {
              statusIcon = <MinusCircle className="size-5 text-gray-400" />;
              statusColor = "text-gray-500";
              borderColor = "border-gray-200";
            } else if (isCorrect) {
              statusIcon = <CheckCircle className="size-5 text-green-500" />;
              statusColor = "text-green-600";
              borderColor = "border-green-200";
            } else {
              statusIcon = <XCircle className="size-5 text-red-500" />;
              statusColor = "text-red-600";
              borderColor = "border-red-200";
            }

            return (
              <Card key={question.id} className={`${borderColor}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5">{statusIcon}</span>
                      <div>
                        <p className="font-medium">
                          Q{index + 1}. {question.questionText}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {isCoding
                              ? "Coding"
                              : question.questionType === "MULTI_SELECT"
                                ? "Multiple Select"
                                : "Single Select"}
                          </Badge>
                          {isCoding && answer?.language && (
                            <Badge
                              variant="outline"
                              className="text-xs border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400"
                            >
                              <Code2 className="size-3 mr-1" />
                              {LANGUAGE_LABELS[answer.language] || answer.language}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {question.marks} mark{question.marks !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${statusColor} whitespace-nowrap`}>
                      {answer?.marksAwarded !== null && answer?.marksAwarded !== undefined
                        ? `${answer.marksAwarded > 0 ? "+" : ""}${answer.marksAwarded}`
                        : "0"}{" "}
                      marks
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* MCQ Options */}
                  {!isCoding && (
                    <div className="space-y-2">
                      {options.map((option) => {
                        const isSelected = selectedIds.includes(option.id);
                        const isCorrectOption = correctIds.includes(option.id);

                        let optionClasses =
                          "flex items-center gap-3 rounded-lg border p-3 text-sm";

                        if (isCorrectOption && isSelected) {
                          optionClasses +=
                            " bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700";
                        } else if (isCorrectOption) {
                          optionClasses +=
                            " bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800";
                        } else if (isSelected) {
                          optionClasses +=
                            " bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700";
                        } else {
                          optionClasses += " border-muted";
                        }

                        return (
                          <div key={option.id} className={optionClasses}>
                            <div className="flex-1">{option.text}</div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected && isCorrectOption && (
                                <CheckCircle className="size-4 text-green-500" />
                              )}
                              {isSelected && !isCorrectOption && (
                                <XCircle className="size-4 text-red-500" />
                              )}
                              {!isSelected && isCorrectOption && (
                                <CheckCircle className="size-4 text-green-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Coding Answer */}
                  {isCoding && (
                    <div className="space-y-3">
                      {answer?.code ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Submitted Code
                          </p>
                          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto whitespace-pre-wrap break-all font-mono">
                            {answer.code}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Not attempted
                        </p>
                      )}

                      {wasAnswered && (
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <Badge className="bg-success">
                              All test cases passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Some test cases failed
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {question.explanation && (
                    <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                        Explanation
                      </p>
                      <p className="text-blue-700 dark:text-blue-400">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
