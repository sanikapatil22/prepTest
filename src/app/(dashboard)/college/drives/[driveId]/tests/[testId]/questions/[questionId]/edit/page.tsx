"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Code2, Eye, EyeOff, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { QuestionText } from "@/components/ui/question-text";

interface Option {
  id: string;
  text: string;
}

interface TestCaseInput {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

let optionCounter = 0;
function generateOptionId() {
  optionCounter += 1;
  return `opt_${Date.now()}_${optionCounter}`;
}

let testCaseCounter = 0;
function generateTestCaseId() {
  testCaseCounter += 1;
  return `tc_${Date.now()}_${testCaseCounter}`;
}

export default function EditQuestionPage() {
  const params = useParams<{ driveId: string; testId: string; questionId: string }>();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [questionText, setQuestionText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState("SINGLE_SELECT");
  const [options, setOptions] = useState<Option[]>([]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [testCases, setTestCases] = useState<TestCaseInput[]>([]);

  const isCoding = questionType === "CODING";

  useEffect(() => {
    async function fetchQuestion() {
      try {
        const res = await fetch(`/api/tests/${params.testId}/questions`);
        if (!res.ok) throw new Error("Failed to fetch questions");
        const questions = await res.json();
        const q = questions.find((q: { id: string }) => q.id === params.questionId);
        if (!q) throw new Error("Question not found");

        setQuestionText(q.questionText);
        setImageUrl(q.imageUrl || null);
        setQuestionType(q.questionType);
        setMarks(q.marks);
        setNegativeMarks(q.negativeMarks ?? 0);
        setExplanation(q.explanation ?? "");

        if (q.questionType === "CODING") {
          setTestCases(
            (q.testCases ?? []).map((tc: { id: string; input: string; expectedOutput: string; isSample: boolean }) => ({
              id: tc.id || generateTestCaseId(),
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isSample: tc.isSample,
            }))
          );
          if ((q.testCases ?? []).length === 0) {
            setTestCases([{ id: generateTestCaseId(), input: "", expectedOutput: "", isSample: true }]);
          }
        } else {
          setOptions(
            (q.options ?? []).map((o: { id: string; text: string }) => ({
              id: o.id,
              text: o.text,
            }))
          );
          setCorrectOptionIds(q.correctOptionIds ?? []);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load question");
        router.push(`/college/drives/${params.driveId}/tests/${params.testId}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestion();
  }, [params.testId, params.questionId, params.driveId, router]);

  function addOption() {
    setOptions((prev) => [...prev, { id: generateOptionId(), text: "" }]);
  }

  function removeOption(id: string) {
    if (options.length <= 2) {
      toast.error("At least 2 options are required");
      return;
    }
    setOptions((prev) => prev.filter((o) => o.id !== id));
    setCorrectOptionIds((prev) => prev.filter((cid) => cid !== id));
  }

  function updateOptionText(id: string, text: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }

  function addTestCase() {
    setTestCases((prev) => [
      ...prev,
      { id: generateTestCaseId(), input: "", expectedOutput: "", isSample: false },
    ]);
  }

  function removeTestCase(id: string) {
    if (testCases.length <= 1) {
      toast.error("At least 1 test case is required");
      return;
    }
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  }

  function updateTestCase(id: string, field: keyof TestCaseInput, value: string | boolean) {
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (isCoding) {
      const validTestCases = testCases.filter((tc) => tc.expectedOutput.trim());
      if (validTestCases.length === 0) {
        toast.error("At least 1 test case with expected output is required");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(
          `/api/tests/${params.testId}/questions/${params.questionId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionText,
              imageUrl: imageUrl || null,
              marks,
              negativeMarks,
              explanation: explanation || null,
              testCases: validTestCases.map((tc, idx) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isSample: tc.isSample,
                order: idx,
              })),
            }),
          }
        );

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update question");
        }

        toast.success("Question updated successfully");
        router.push(`/college/drives/${params.driveId}/tests/${params.testId}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const filledOptions = options.filter((o) => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error("At least 2 options with text are required");
        return;
      }
      const validCorrect = correctOptionIds.filter((id) =>
        filledOptions.some((o) => o.id === id)
      );
      if (validCorrect.length === 0) {
        toast.error("Please select at least one correct option");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(
          `/api/tests/${params.testId}/questions/${params.questionId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionText,
              imageUrl: imageUrl || null,
              questionType,
              options: filledOptions,
              correctOptionIds: validCorrect,
              marks,
              negativeMarks,
              explanation: explanation || null,
            }),
          }
        );

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update question");
        }

        toast.success("Question updated successfully");
        router.push(`/college/drives/${params.driveId}/tests/${params.testId}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/college/drives/${params.driveId}/tests/${params.testId}`}>
            <ArrowLeft />
            Back to Test
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Edit Question</h1>
        <p className="text-muted-foreground">Update the question details below.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
          <CardDescription>
            {isCoding
              ? "Update the coding challenge and test cases."
              : "Update the question, options, and correct answer(s)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="questionText">
                Question Text <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1 mb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => {
                    const ta = textareaRef.current;
                    if (!ta) return;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const selected = questionText.slice(start, end);
                    const codeBlock = selected
                      ? "```\n" + selected + "\n```"
                      : "```\n// paste code here\n```";
                    const newText =
                      questionText.slice(0, start) + codeBlock + questionText.slice(end);
                    setQuestionText(newText);
                    setShowPreview(false);
                    setTimeout(() => {
                      ta.focus();
                      const cursor = start + codeBlock.length;
                      ta.setSelectionRange(cursor, cursor);
                    }, 0);
                  }}
                >
                  <Code2 className="size-3.5" />
                  Code Block
                </Button>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              {showPreview ? (
                <div className="min-h-[120px] rounded-md border bg-background p-3">
                  {questionText.trim() ? (
                    <QuestionText>{questionText}</QuestionText>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nothing to preview</p>
                  )}
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  id="questionText"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={
                    isCoding
                      ? "Describe the coding problem... (supports Markdown)"
                      : "Enter your question here... (supports Markdown)"
                  }
                  rows={4}
                  className="font-mono text-sm"
                  required
                />
              )}
              <p className="text-xs text-muted-foreground">
                Supports Markdown. Wrap code in{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">```</code>{" "}
                fences for proper formatting.
              </p>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>
                Image <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              {imageUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Question image"
                    className="max-h-48 rounded-md border object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow"
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 w-fit rounded-md border px-4 h-9 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <ImagePlus className="size-4" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {/* Question Type — read-only display for coding, editable for MCQ */}
            {!isCoding && (
              <div className="space-y-2">
                <Label htmlFor="questionType">Question Type</Label>
                <Select value={questionType} onValueChange={(v) => { setQuestionType(v); setCorrectOptionIds([]); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE_SELECT">Single Select (Radio)</SelectItem>
                    <SelectItem value="MULTI_SELECT">Multi Select (Checkbox)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* MCQ Options */}
            {!isCoding && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Options <span className="text-destructive">*</span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="size-4" />
                    Add Option
                  </Button>
                </div>

                {questionType === "SINGLE_SELECT" ? (
                  <RadioGroup
                    value={correctOptionIds[0] || ""}
                    onValueChange={(v) => setCorrectOptionIds([v])}
                    className="space-y-3"
                  >
                    {options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-3">
                        <RadioGroupItem value={option.id} id={`radio-${option.id}`} />
                        <Input
                          className="flex-1"
                          placeholder={`Option ${index + 1}`}
                          value={option.text}
                          onChange={(e) => updateOptionText(option.id, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(option.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`check-${option.id}`}
                          checked={correctOptionIds.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCorrectOptionIds((prev) => [...prev, option.id]);
                            } else {
                              setCorrectOptionIds((prev) => prev.filter((id) => id !== option.id));
                            }
                          }}
                        />
                        <Input
                          className="flex-1"
                          placeholder={`Option ${index + 1}`}
                          value={option.text}
                          onChange={(e) => updateOptionText(option.id, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(option.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {questionType === "SINGLE_SELECT"
                    ? "Select the radio button next to the correct answer."
                    : "Check the boxes next to all correct answers."}
                </p>
              </div>
            )}

            {/* Test Cases for Coding */}
            {isCoding && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Test Cases <span className="text-destructive">*</span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                    <Plus className="size-4" />
                    Add Test Case
                  </Button>
                </div>

                {testCases.map((tc, index) => (
                  <Card key={tc.id} className="border-dashed">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Test Case {index + 1}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`sample-${tc.id}`}
                              checked={tc.isSample}
                              onCheckedChange={(checked) =>
                                updateTestCase(tc.id, "isSample", checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`sample-${tc.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Sample (visible to students)
                            </Label>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(tc.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Input</Label>
                        <Textarea
                          value={tc.input}
                          onChange={(e) => updateTestCase(tc.id, "input", e.target.value)}
                          placeholder="Enter input (can be empty)"
                          rows={2}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">
                          Expected Output <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          value={tc.expectedOutput}
                          onChange={(e) => updateTestCase(tc.id, "expectedOutput", e.target.value)}
                          placeholder="Enter expected output"
                          rows={2}
                          className="font-mono text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <p className="text-xs text-muted-foreground">
                  Mark test cases as &ldquo;Sample&rdquo; to make them visible to students.
                </p>
              </div>
            )}

            {/* Marks */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="negativeMarks">Negative Marks</Label>
                <Input
                  id="negativeMarks"
                  type="number"
                  min={0}
                  step="0.25"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation (optional)</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain the correct answer (shown after submission)"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/college/drives/${params.driveId}/tests/${params.testId}`}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
