"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ArrowLeft, Loader2, Plus, Trash2, BarChart3, Upload } from "lucide-react";

interface TestData {
  id: string;
  driveId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  shuffleQuestions: boolean;
  status: string;
  drive: {
    id: string;
    title: string;
    companyName: string | null;
    college: { id: string; name: string };
  };
  _count: { questions: number; attempts: number };
}

interface QuestionData {
  id: string;
  questionText: string;
  questionType: string;
  marks: number;
  order: number;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
}

const testStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  CLOSED: "outline",
};

export default function TestDetailPage() {
  const params = useParams<{ driveId: string; testId: string }>();
  const router = useRouter();

  const [test, setTest] = useState<TestData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingMarks, setPassingMarks] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [status, setStatus] = useState("DRAFT");

  useEffect(() => {
    async function fetchData() {
      try {
        const [testRes, questionsRes] = await Promise.all([
          fetch(`/api/tests/${params.testId}`),
          fetch(`/api/tests/${params.testId}/questions`),
        ]);

        if (!testRes.ok) throw new Error("Failed to fetch test");

        const testData: TestData = await testRes.json();
        setTest(testData);
        setTitle(testData.title);
        setDescription(testData.description || "");
        setInstructions(testData.instructions || "");
        setDurationMinutes(testData.durationMinutes);
        setPassingMarks(testData.passingMarks);
        setShuffleQuestions(testData.shuffleQuestions);
        setStatus(testData.status);

        if (questionsRes.ok) {
          const questionsData: QuestionData[] = await questionsRes.json();
          setQuestions(questionsData);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load test"
        );
        router.push(`/college/drives/${params.driveId}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.testId, params.driveId, router]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/tests/${params.testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          instructions: instructions || undefined,
          durationMinutes,
          passingMarks,
          shuffleQuestions,
          status,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update test");
      }

      toast.success("Test updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    setDeletingId(questionId);

    try {
      const res = await fetch(
        `/api/tests/${params.testId}/questions/${questionId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete question");
      }

      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast.success("Question deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/college/drives/${params.driveId}`}>
            <ArrowLeft />
            Back to Drive
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
          <Badge variant={testStatusVariant[test.status] ?? "secondary"}>
            {test.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage test details and questions.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Test</CardTitle>
          <CardDescription>
            Update the test details below and save your changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(parseInt(e.target.value) || 60)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingMarks">Passing Marks</Label>
                <Input
                  id="passingMarks"
                  type="number"
                  min={0}
                  value={passingMarks}
                  onChange={(e) =>
                    setPassingMarks(parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="shuffleQuestions"
                checked={shuffleQuestions}
                onCheckedChange={setShuffleQuestions}
              />
              <Label htmlFor="shuffleQuestions">Shuffle questions</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link
                  href={`/college/drives/${params.driveId}/tests/${params.testId}/results`}
                >
                  <BarChart3 />
                  View Results
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
            <p className="text-sm text-muted-foreground">
              {questions.length} question{questions.length !== 1 ? "s" : ""} in
              this test.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link
                href={`/college/drives/${params.driveId}/tests/${params.testId}/questions/upload`}
              >
                <Upload />
                Upload CSV
              </Link>
            </Button>
            <Button asChild>
              <Link
                href={`/college/drives/${params.driveId}/tests/${params.testId}/questions/new`}
              >
                <Plus />
                Add Question
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Marks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No questions yet. Add questions to this test.
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((question, index) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">
                      {question.order || index + 1}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {question.questionText.length > 80
                        ? question.questionText.substring(0, 80) + "..."
                        : question.questionText}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {question.questionType === "CODING"
                          ? "Coding"
                          : question.questionType === "SINGLE_SELECT"
                            ? "Single"
                            : "Multi"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {question.marks}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Question
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this question?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteQuestion(question.id)
                              }
                              disabled={deletingId === question.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === question.id && (
                                <Loader2 className="animate-spin" />
                              )}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
