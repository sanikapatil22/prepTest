"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

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

export default function NewLibraryQuestionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("SINGLE_SELECT");
  const [options, setOptions] = useState<Option[]>([
    { id: generateOptionId(), text: "" },
    { id: generateOptionId(), text: "" },
    { id: generateOptionId(), text: "" },
    { id: generateOptionId(), text: "" },
  ]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");

  const [categories, setCategories] = useState<string[]>([]);

  const [testCases, setTestCases] = useState<TestCaseInput[]>([
    { id: generateTestCaseId(), input: "", expectedOutput: "", isSample: true },
  ]);

  const isCoding = questionType === "CODING";

  useEffect(() => {
    fetch("/api/library/categories?scope=private")
      .then((res) => res.json())
      .then((cats: string[]) => setCategories(cats))
      .catch(() => {});
  }, []);

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

  function handleSingleSelectChange(optionId: string) {
    setCorrectOptionIds([optionId]);
  }

  function handleMultiSelectChange(optionId: string, checked: boolean) {
    if (checked) {
      setCorrectOptionIds((prev) => [...prev, optionId]);
    } else {
      setCorrectOptionIds((prev) => prev.filter((id) => id !== optionId));
    }
  }

  function handleQuestionTypeChange(value: string) {
    setQuestionType(value);
    setCorrectOptionIds([]);
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
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (!category.trim()) {
      toast.error("Category is required");
      return;
    }

    setIsSubmitting(true);

    let body: Record<string, unknown>;

    if (isCoding) {
      const validTestCases = testCases.filter((tc) => tc.expectedOutput.trim());
      if (validTestCases.length === 0) {
        toast.error("At least 1 test case with expected output is required");
        setIsSubmitting(false);
        return;
      }

      body = {
        questionText,
        questionType: "CODING",
        testCases: validTestCases.map((tc, idx) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample,
          order: idx,
        })),
        marks,
        negativeMarks,
        explanation: explanation || undefined,
        category,
        difficulty,
      };
    } else {
      const filledOptions = options.filter((o) => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error("At least 2 options with text are required");
        setIsSubmitting(false);
        return;
      }
      if (correctOptionIds.length === 0) {
        toast.error("Please select at least one correct option");
        setIsSubmitting(false);
        return;
      }

      body = {
        questionText,
        questionType,
        options: filledOptions,
        correctOptionIds,
        marks,
        negativeMarks,
        explanation: explanation || undefined,
        category,
        difficulty,
      };
    }

    try {
      const res = await fetch("/api/library/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create question");
      }

      toast.success("Question added to library");
      router.push("/college/library?tab=private");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/college/library?tab=private">
            <ArrowLeft />
            Back to Library
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Add to My Library</h1>
        <p className="text-muted-foreground">
          Create a new question for your college&apos;s private library.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
          <CardDescription>
            {isCoding
              ? "Set up the coding challenge with test cases."
              : "Fill in the question, options, and mark the correct answer(s)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="questionText">
                Question Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="questionText"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder={isCoding ? "Describe the coding problem..." : "Enter your question here..."}
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
              <Label htmlFor="questionType">Question Type</Label>
              <Select value={questionType} onValueChange={handleQuestionTypeChange}>
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
                    onValueChange={handleSingleSelectChange}
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
                          onCheckedChange={(checked) =>
                            handleMultiSelectChange(option.id, checked as boolean)
                          }
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
                            <Label htmlFor={`sample-${tc.id}`} className="text-xs text-muted-foreground">
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
                placeholder="Explain the correct answer"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add Question
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/college/library?tab=private">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
