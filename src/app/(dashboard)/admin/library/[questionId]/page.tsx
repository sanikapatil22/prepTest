"use client";

import { useEffect, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

interface Option {
  id: string;
  text: string;
}

interface TestCaseData {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  order: number;
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

export default function EditLibraryQuestionPage() {
  const params = useParams<{ questionId: string }>();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("SINGLE_SELECT");
  const [options, setOptions] = useState<Option[]>([]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [categories, setCategories] = useState<string[]>([]);

  const [testCases, setTestCases] = useState<TestCaseData[]>([]);

  const isCoding = questionType === "CODING";

  useEffect(() => {
    async function fetchData() {
      try {
        const [qRes, catRes] = await Promise.all([
          fetch(`/api/library/questions/${params.questionId}`),
          fetch("/api/library/categories"),
        ]);

        if (!qRes.ok) throw new Error("Failed to fetch question");

        const q = await qRes.json();
        setQuestionText(q.questionText);
        setQuestionType(q.questionType);
        setOptions(q.questionType === "CODING" ? [] : (q.options as Option[]));
        setCorrectOptionIds(q.questionType === "CODING" ? [] : (q.correctOptionIds as string[]));
        setMarks(q.marks);
        setNegativeMarks(q.negativeMarks);
        setExplanation(q.explanation || "");
        setCategory(q.category);
        setDifficulty(q.difficulty);

        if (q.testCases) {
          setTestCases(q.testCases);
        }

        if (catRes.ok) {
          setCategories(await catRes.json());
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load question");
        router.push("/admin/library");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.questionId, router]);

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
      { id: generateTestCaseId(), input: "", expectedOutput: "", isSample: false, order: prev.length },
    ]);
  }

  function removeTestCase(id: string) {
    if (testCases.length <= 1) {
      toast.error("At least 1 test case is required");
      return;
    }
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  }

  function updateTestCase(id: string, field: string, value: string | boolean) {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }
    if (!category.trim()) {
      toast.error("Category is required");
      return;
    }

    setIsSaving(true);

    const body: Record<string, unknown> = {
      questionText,
      questionType,
      category,
      difficulty,
      marks,
      negativeMarks,
      explanation: explanation || undefined,
    };

    if (isCoding) {
      const validTestCases = testCases.filter((tc) => tc.expectedOutput.trim());
      if (validTestCases.length === 0) {
        toast.error("At least 1 test case with expected output is required");
        setIsSaving(false);
        return;
      }
      body.testCases = validTestCases.map((tc, idx) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample,
        order: idx,
      }));
    } else {
      const filledOptions = options.filter((o) => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error("At least 2 options with text are required");
        setIsSaving(false);
        return;
      }
      if (correctOptionIds.length === 0) {
        toast.error("Please select at least one correct option");
        setIsSaving(false);
        return;
      }
      body.options = filledOptions;
      body.correctOptionIds = correctOptionIds;
    }

    try {
      const res = await fetch(`/api/library/questions/${params.questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update question");
      }

      toast.success("Question updated");
      router.push("/admin/library");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/library/questions/${params.questionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete question");
      toast.success("Question deleted");
      router.push("/admin/library");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/admin/library">
            <ArrowLeft />
            Back to Library
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Edit Library Question</h1>
        <p className="text-muted-foreground">Update or delete this library question.</p>
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
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="questionText">
                Question Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="questionText"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Math, DSA, DBMS"
                  list="category-suggestions"
                  required
                />
                <datalist id="category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={questionType}
                onValueChange={(v) => {
                  setQuestionType(v);
                  setCorrectOptionIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_SELECT">Single Select (Radio)</SelectItem>
                  <SelectItem value="MULTI_SELECT">Multi Select (Checkbox)</SelectItem>
                  <SelectItem value="CODING">Coding Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                    onValueChange={(id) => setCorrectOptionIds([id])}
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
                            <Label htmlFor={`sample-${tc.id}`} className="text-xs text-muted-foreground">
                              Sample
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
                          rows={2}
                          className="font-mono text-sm"
                          required
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

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

            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation (optional)</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/library">Cancel</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    <Trash2 />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Question</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this question from the library. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
