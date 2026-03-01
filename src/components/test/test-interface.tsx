"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitDialog } from "@/components/test/submit-dialog";
import { ViolationBanner } from "@/components/test/violation-banner";
import { CodeEditor } from "@/components/test/code-editor";
import { useProctoring } from "@/hooks/use-proctoring";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  Save,
  ShieldAlert,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Option {
  id: string;
  text: string;
}

interface SampleTestCase {
  input: string;
  expectedOutput: string;
}

interface Question {
  id: string;
  questionText: string;
  questionType: "SINGLE_SELECT" | "MULTI_SELECT" | "CODING";
  options: Option[];
  marks: number;
  order: number;
  testCases?: SampleTestCase[];
}

interface Attempt {
  id: string;
  testId: string;
  startedAt: string;
  status: string;
}

interface AttemptDetail {
  id: string;
  testId: string;
  startedAt: string;
  status: string;
  test: {
    title: string;
    durationMinutes: number;
    totalMarks: number;
  };
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
    code?: string | null;
    language?: string | null;
  }>;
}

type CodingLanguage = "PYTHON" | "JAVA" | "C" | "CPP";

interface CodeAnswer {
  code: string;
  language: CodingLanguage;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TestInterfaceProps {
  testId: string;
}

export function TestInterface({ testId }: TestInterfaceProps) {
  const router = useRouter();

  // Core state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [codeAnswers, setCodeAnswers] = useState<Map<string, CodeAnswer>>(
    new Map()
  );
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [testTitle, setTestTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [autoSubmittedByViolation, setAutoSubmittedByViolation] =
    useState(false);

  // Refs for debounced save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSavesRef = useRef<Map<string, string[]>>(new Map());
  const pendingCodeSavesRef = useRef<Map<string, CodeAnswer>>(new Map());

  // Proctoring
  const handleViolationAutoSubmit = useCallback(() => {
    setAutoSubmittedByViolation(true);
  }, []);
  const { violations, warningMessage } = useProctoring(
    attemptId,
    5,
    handleViolationAutoSubmit
  );

  // ----------------------------------------------------------
  // Initialize: start attempt, fetch questions, restore answers
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setLoading(true);
        setError(null);

        // 1. Start/resume the attempt
        const startRes = await fetch(`/api/tests/${testId}/start`, {
          method: "POST",
        });

        if (!startRes.ok) {
          const data = await startRes.json();
          if (startRes.status === 409) {
            setError("You have already completed this test.");
          } else {
            setError(data.error || "Failed to start the test.");
          }
          return;
        }

        const attempt: Attempt = await startRes.json();
        if (cancelled) return;

        setAttemptId(attempt.id);
        setStartedAt(new Date(attempt.startedAt));

        // 2. Fetch questions
        const qRes = await fetch(`/api/tests/${testId}/questions`);
        if (!qRes.ok) {
          setError("Failed to load questions.");
          return;
        }
        const qData: Question[] = await qRes.json();
        if (cancelled) return;

        // Parse options if they come as JSON string
        const parsedQuestions = qData.map((q) => ({
          ...q,
          options:
            typeof q.options === "string"
              ? JSON.parse(q.options)
              : q.options,
        }));
        setQuestions(parsedQuestions);

        // 3. Fetch attempt detail to restore answers and get test info
        const detailRes = await fetch(`/api/attempts/${attempt.id}`);
        if (detailRes.ok) {
          const detail: AttemptDetail = await detailRes.json();
          if (cancelled) return;

          setDurationMinutes(detail.test.durationMinutes);
          setTestTitle(detail.test.title);
          setTotalMarks(detail.test.totalMarks);

          // Restore saved answers
          if (detail.answers && detail.answers.length > 0) {
            const restoredMcq = new Map<string, string[]>();
            const restoredCode = new Map<string, CodeAnswer>();

            for (const ans of detail.answers) {
              // Check if this is a coding answer
              if (ans.code && ans.language) {
                restoredCode.set(ans.questionId, {
                  code: ans.code,
                  language: ans.language as CodingLanguage,
                });
              }
              if (ans.selectedOptionIds && ans.selectedOptionIds.length > 0) {
                restoredMcq.set(ans.questionId, ans.selectedOptionIds);
              }
            }

            setAnswers(restoredMcq);
            setCodeAnswers(restoredCode);
          }
        }
      } catch {
        if (!cancelled) {
          setError("An unexpected error occurred. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [testId]);

  // ----------------------------------------------------------
  // Timer
  // ----------------------------------------------------------

  useEffect(() => {
    if (!startedAt || submitted) return;

    function tick() {
      const now = new Date();
      const elapsed = Math.floor(
        (now.getTime() - startedAt!.getTime()) / 1000
      );
      const total = durationMinutes * 60;
      const remaining = Math.max(0, total - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        handleAutoSubmit();
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, durationMinutes, submitted]);

  // ----------------------------------------------------------
  // Auto-save (MCQ)
  // ----------------------------------------------------------

  const saveAnswer = useCallback(
    async (questionId: string, selectedOptionIds: string[]) => {
      if (!attemptId) return;

      pendingSavesRef.current.set(questionId, selectedOptionIds);

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const saves = new Map(pendingSavesRef.current);
        const codeSaves = new Map(pendingCodeSavesRef.current);
        pendingSavesRef.current.clear();
        pendingCodeSavesRef.current.clear();

        setSaveStatus("saving");

        try {
          // Save all pending MCQ answers
          for (const [qId, optIds] of saves) {
            const res = await fetch(`/api/attempts/${attemptId}/answers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId: qId,
                selectedOptionIds: optIds,
              }),
            });

            if (!res.ok) {
              console.error("Failed to save answer for question:", qId);
              setSaveStatus("error");
              return;
            }
          }

          // Save all pending code answers
          for (const [qId, codeAns] of codeSaves) {
            const res = await fetch(`/api/attempts/${attemptId}/answers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId: qId,
                selectedOptionIds: [],
                code: codeAns.code,
                language: codeAns.language,
              }),
            });

            if (!res.ok) {
              console.error("Failed to save code answer for question:", qId);
              setSaveStatus("error");
              return;
            }
          }

          setSaveStatus("saved");

          // Reset back to idle after 2s
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("error");
        }
      }, 2000);
    },
    [attemptId]
  );

  // ----------------------------------------------------------
  // Auto-save (Code)
  // ----------------------------------------------------------

  const saveCodeAnswer = useCallback(
    (questionId: string, code: string, language: CodingLanguage) => {
      if (!attemptId) return;

      pendingCodeSavesRef.current.set(questionId, { code, language });

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const saves = new Map(pendingSavesRef.current);
        const codeSaves = new Map(pendingCodeSavesRef.current);
        pendingSavesRef.current.clear();
        pendingCodeSavesRef.current.clear();

        setSaveStatus("saving");

        try {
          for (const [qId, optIds] of saves) {
            const res = await fetch(`/api/attempts/${attemptId}/answers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId: qId,
                selectedOptionIds: optIds,
              }),
            });
            if (!res.ok) {
              setSaveStatus("error");
              return;
            }
          }

          for (const [qId, codeAns] of codeSaves) {
            const res = await fetch(`/api/attempts/${attemptId}/answers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId: qId,
                selectedOptionIds: [],
                code: codeAns.code,
                language: codeAns.language,
              }),
            });
            if (!res.ok) {
              setSaveStatus("error");
              return;
            }
          }

          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("error");
        }
      }, 2000);
    },
    [attemptId]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ----------------------------------------------------------
  // Answer selection (MCQ)
  // ----------------------------------------------------------

  const handleOptionSelect = useCallback(
    (questionId: string, optionId: string, questionType: string) => {
      setAnswers((prev) => {
        const next = new Map(prev);

        if (questionType === "SINGLE_SELECT") {
          next.set(questionId, [optionId]);
        } else {
          // MULTI_SELECT: toggle
          const current = next.get(questionId) || [];
          if (current.includes(optionId)) {
            const filtered = current.filter((id) => id !== optionId);
            if (filtered.length === 0) {
              next.delete(questionId);
            } else {
              next.set(questionId, filtered);
            }
          } else {
            next.set(questionId, [...current, optionId]);
          }
        }

        // Trigger auto-save
        const selected = next.get(questionId) || [];
        saveAnswer(questionId, selected);

        return next;
      });
    },
    [saveAnswer]
  );

  // ----------------------------------------------------------
  // Code change handler
  // ----------------------------------------------------------

  const handleCodeChange = useCallback(
    (questionId: string, code: string, language: CodingLanguage) => {
      setCodeAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, { code, language });
        return next;
      });
      saveCodeAnswer(questionId, code, language);
    },
    [saveCodeAnswer]
  );

  // ----------------------------------------------------------
  // Flag for review
  // ----------------------------------------------------------

  const toggleFlag = useCallback((questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  // ----------------------------------------------------------
  // Submit
  // ----------------------------------------------------------

  const handleSubmit = useCallback(
    async (options?: { autoSubmitted?: boolean }) => {
      if (!attemptId || submitting) return;

      setSubmitting(true);
      try {
        // Flush any pending saves first
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Save any remaining pending MCQ answers immediately
        for (const [qId, optIds] of pendingSavesRef.current) {
          await fetch(`/api/attempts/${attemptId}/answers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: qId,
              selectedOptionIds: optIds,
            }),
          });
        }
        pendingSavesRef.current.clear();

        // Save any remaining pending code answers immediately
        for (const [qId, codeAns] of pendingCodeSavesRef.current) {
          await fetch(`/api/attempts/${attemptId}/answers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: qId,
              selectedOptionIds: [],
              code: codeAns.code,
              language: codeAns.language,
            }),
          });
        }
        pendingCodeSavesRef.current.clear();

        const res = await fetch(`/api/tests/${testId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            autoSubmitted: options?.autoSubmitted ?? false,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to submit test.");
          setSubmitting(false);
          return;
        }

        const result = await res.json();
        setSubmitted(true);
        setShowSubmitDialog(false);

        // Short delay then redirect to results
        setTimeout(() => {
          router.push(`/student/results/${result.id}`);
        }, 1500);
      } catch {
        setError("Failed to submit. Please try again.");
        setSubmitting(false);
      }
    },
    [attemptId, testId, submitting, router]
  );

  const handleAutoSubmit = useCallback(() => {
    if (submitted || submitting) return;
    handleSubmit();
  }, [submitted, submitting, handleSubmit]);

  // Auto-submit triggered by proctoring violations
  useEffect(() => {
    if (autoSubmittedByViolation && !submitted && !submitting) {
      handleSubmit({ autoSubmitted: true });
    }
  }, [autoSubmittedByViolation, submitted, submitting, handleSubmit]);

  // ----------------------------------------------------------
  // Computed values
  // ----------------------------------------------------------

  const currentQuestion = questions[currentIndex];

  // Count answered: MCQ answers + code answers
  const answeredCount =
    answers.size +
    Array.from(codeAnswers.values()).filter((ca) => ca.code.trim().length > 0)
      .length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flagged.size;

  const isQuestionAnswered = (q: Question) => {
    if (q.questionType === "CODING") {
      const ca = codeAnswers.get(q.id);
      return ca ? ca.code.trim().length > 0 : false;
    }
    return answers.has(q.id);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ----------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Error state
  // ----------------------------------------------------------

  if (error && !submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="mx-auto size-12 text-destructive" />
            <h2 className="text-lg font-semibold">Cannot start test</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button onClick={() => router.push("/student/tests")}>
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Submitted state
  // ----------------------------------------------------------

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="mx-auto size-12 text-green-500" />
            <h2 className="text-xl font-semibold">
              {autoSubmittedByViolation
                ? "Test Auto-Submitted Due to Violations"
                : "Test Submitted Successfully!"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {autoSubmittedByViolation
                ? "You exceeded the maximum allowed violations. Your answers have been recorded."
                : "Your answers have been recorded. Redirecting to results..."}
            </p>
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------------
  // No questions
  // ----------------------------------------------------------

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="mx-auto size-12 text-yellow-500" />
            <h2 className="text-lg font-semibold">No questions found</h2>
            <p className="text-muted-foreground text-sm">
              This test does not have any questions yet.
            </p>
            <Button onClick={() => router.push("/student/tests")}>
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Main test interface
  // ----------------------------------------------------------

  const isTimeLow =
    remainingSeconds !== null && remainingSeconds < 300; // < 5 min

  return (
    <div className="flex flex-col h-screen">
      {/* ---- Top Bar ---- */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold truncate max-w-[300px] text-balance">
            {testTitle}
          </h1>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {totalMarks} marks
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Save indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="size-3 animate-spin" />
                Saving...
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Save className="size-3 text-green-500" />
                Saved
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="size-3 text-red-500" />
                Save failed
              </>
            )}
          </div>

          {/* Violation count */}
          {violations.totalViolations > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400">
              <ShieldAlert className="size-4" />
              {violations.totalViolations}/5
            </div>
          )}

          {/* Timer */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-medium",
              isTimeLow
                ? "border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400"
                : "border-muted"
            )}
          >
            <Clock
              className={cn(
                "size-4",
                isTimeLow ? "text-red-500 animate-pulse" : ""
              )}
            />
            {remainingSeconds !== null ? formatTime(remainingSeconds) : "--:--"}
          </div>
        </div>
      </header>

      {/* ---- Violation Banner ---- */}
      <ViolationBanner
        totalViolations={violations.totalViolations}
        maxViolations={5}
        lastWarning={warningMessage}
      />

      {/* ---- Main Content ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---- Question Area (left) ---- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            {currentQuestion && (
              <div className="max-w-3xl mx-auto">
                {/* Question header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        Question {currentIndex + 1} of {questions.length}
                      </Badge>
                      <Badge variant="outline">
                        {currentQuestion.marks} mark
                        {currentQuestion.marks !== 1 ? "s" : ""}
                      </Badge>
                      {currentQuestion.questionType === "MULTI_SELECT" && (
                        <Badge
                          variant="outline"
                          className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"
                        >
                          Multiple Answers
                        </Badge>
                      )}
                      {currentQuestion.questionType === "CODING" && (
                        <Badge
                          variant="outline"
                          className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400"
                        >
                          <Code2 className="size-3 mr-1" />
                          Coding
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-medium leading-relaxed">
                      {currentQuestion.questionText}
                    </h2>
                  </div>
                </div>

                {/* MCQ Options */}
                {currentQuestion.questionType !== "CODING" && (
                  <>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, optIdx) => {
                        const selectedIds =
                          answers.get(currentQuestion.id) || [];
                        const isSelected = selectedIds.includes(option.id);
                        const isSingle =
                          currentQuestion.questionType === "SINGLE_SELECT";

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              handleOptionSelect(
                                currentQuestion.id,
                                option.id,
                                currentQuestion.questionType
                              )
                            }
                            className={cn(
                              "flex w-full items-start gap-3 rounded-lg border p-4 text-left text-sm transition-colors hover:bg-muted/50",
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-muted"
                            )}
                          >
                            {/* Radio / Checkbox indicator */}
                            <div
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
                                isSingle ? "rounded-full" : "rounded",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              )}
                            >
                              {isSelected &&
                                (isSingle ? (
                                  <div className="size-2 rounded-full bg-current" />
                                ) : (
                                  <svg
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    className="size-3"
                                  >
                                    <path
                                      d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ))}
                            </div>
                            <div>
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              {option.text}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Clear answer */}
                    {answers.has(currentQuestion.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-muted-foreground"
                        onClick={() => {
                          setAnswers((prev) => {
                            const next = new Map(prev);
                            next.delete(currentQuestion.id);
                            saveAnswer(currentQuestion.id, []);
                            return next;
                          });
                        }}
                      >
                        Clear Answer
                      </Button>
                    )}
                  </>
                )}

                {/* Code Editor for CODING questions */}
                {currentQuestion.questionType === "CODING" && attemptId && (
                  <CodeEditor
                    attemptId={attemptId}
                    questionId={currentQuestion.id}
                    sampleTestCases={
                      currentQuestion.testCases?.map((tc) => ({
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                      })) || []
                    }
                    initialCode={codeAnswers.get(currentQuestion.id)?.code}
                    initialLanguage={
                      codeAnswers.get(currentQuestion.id)?.language
                    }
                    onCodeChange={(code, language) =>
                      handleCodeChange(currentQuestion.id, code, language)
                    }
                  />
                )}
              </div>
            )}
          </ScrollArea>

          {/* ---- Bottom Navigation ---- */}
          <div className="flex items-center justify-between border-t bg-background px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="size-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === questions.length - 1}
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min(questions.length - 1, i + 1)
                  )
                }
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {currentQuestion && (
                <Button
                  variant={
                    flagged.has(currentQuestion.id) ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleFlag(currentQuestion.id)}
                >
                  <Flag
                    className={cn(
                      "size-4 mr-1",
                      flagged.has(currentQuestion.id)
                        ? "text-orange-500 fill-orange-500"
                        : ""
                    )}
                  />
                  {flagged.has(currentQuestion.id)
                    ? "Flagged"
                    : "Mark for Review"}
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setShowSubmitDialog(true)}
                className="bg-success hover:bg-success/90"
              >
                <Send className="size-4 mr-1" />
                Submit Test
              </Button>
            </div>
          </div>
        </div>

        {/* ---- Navigation Panel (right sidebar) ---- */}
        <div className="hidden md:flex w-[280px] flex-col border-l bg-muted/30 shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-3">Question Navigator</h3>
            <div className="grid grid-cols-6 gap-1.5">
              {questions.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q);
                const isFlagged = flagged.has(q.id);
                const isCurrent = idx === currentIndex;
                const isCoding = q.questionType === "CODING";

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded text-xs font-medium transition-colors",
                      isCurrent
                        ? "ring-2 ring-primary ring-offset-1"
                        : "",
                      isFlagged
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                        : isAnswered
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : isCoding
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-muted text-muted-foreground"
                    )}
                    title={`Question ${idx + 1}${isCoding ? " (coding)" : ""}${isFlagged ? " (flagged)" : ""}${isAnswered ? " (answered)" : ""}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-green-500" />
                  <span>Answered</span>
                </div>
                <span className="font-medium">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-muted-foreground/30" />
                  <span>Unanswered</span>
                </div>
                <span className="font-medium">{unansweredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-orange-400" />
                  <span>Flagged</span>
                </div>
                <span className="font-medium">{flaggedCount}</span>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{questions.length}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-auto p-4 border-t">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
              Legend
            </h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-green-100 dark:bg-green-900/40" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-muted" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-purple-100 dark:bg-purple-900/40" />
                <span>Coding Question</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-orange-100 dark:bg-orange-900/40" />
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded ring-2 ring-primary ring-offset-1" />
                <span>Current Question</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Submit Dialog ---- */}
      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmit}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        flaggedCount={flaggedCount}
        loading={submitting}
      />
    </div>
  );
}
