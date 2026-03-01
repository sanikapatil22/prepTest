"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Plus, Trash2, BarChart3, Upload, Eye, X, Search, Users } from "lucide-react";

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
  allowedDepartmentIds: string[] | null;
  allowedSemesters: number[] | null;
  allowedStudentIds: string[] | null;
  drive: {
    id: string;
    title: string;
    companyName: string | null;
    college: { id: string; name: string };
  };
  _count: { questions: number; attempts: number };
}

interface DepartmentData {
  id: string;
  name: string;
  code: string | null;
}

interface StudentSearchResult {
  id: string;
  name: string;
  usn: string | null;
  department: { name: string } | null;
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
  const [isDeletingTest, setIsDeletingTest] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingMarks, setPassingMarks] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [status, setStatus] = useState("DRAFT");

  // Eligibility state
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [allowedDepartmentIds, setAllowedDepartmentIds] = useState<string[]>([]);
  const [allowedSemesters, setAllowedSemesters] = useState<number[]>([]);
  const [allowedStudentIds, setAllowedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchResult[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [testRes, questionsRes, deptRes] = await Promise.all([
          fetch(`/api/tests/${params.testId}`),
          fetch(`/api/tests/${params.testId}/questions`),
          fetch(`/api/departments`),
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

        // Initialize eligibility state
        setAllowedDepartmentIds(testData.allowedDepartmentIds ?? []);
        setAllowedSemesters(testData.allowedSemesters ?? []);
        const studentIds = testData.allowedStudentIds ?? [];
        setAllowedStudentIds(studentIds);

        // Fetch details for pre-selected students
        if (studentIds.length > 0) {
          const studentsRes = await fetch(`/api/students`);
          if (studentsRes.ok) {
            const allStudents: StudentSearchResult[] = await studentsRes.json();
            setSelectedStudents(
              allStudents.filter((s) => studentIds.includes(s.id))
            );
          }
        }

        if (questionsRes.ok) {
          const questionsData: QuestionData[] = await questionsRes.json();
          setQuestions(questionsData);
        }

        if (deptRes.ok) {
          const deptData: DepartmentData[] = await deptRes.json();
          setDepartments(deptData);
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
          allowedDepartmentIds: allowedDepartmentIds.length > 0 ? allowedDepartmentIds : null,
          allowedSemesters: allowedSemesters.length > 0 ? allowedSemesters : null,
          allowedStudentIds: allowedStudentIds.length > 0 ? allowedStudentIds : null,
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

  async function handleDeleteTest() {
    setIsDeletingTest(true);

    try {
      const res = await fetch(`/api/tests/${params.testId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete test");
      }

      toast.success("Test deleted successfully");
      router.push(`/college/drives/${params.driveId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsDeletingTest(false);
    }
  }

  // Debounced student search
  const searchStudents = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data: StudentSearchResult[] = await res.json();
        // Exclude already-selected students
        setSearchResults(data.filter((s) => !allowedStudentIds.includes(s.id)));
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  }, [allowedStudentIds]);

  useEffect(() => {
    const timer = setTimeout(() => searchStudents(studentSearch), 300);
    return () => clearTimeout(timer);
  }, [studentSearch, searchStudents]);

  // Fetch eligible count when eligibility criteria change
  useEffect(() => {
    async function fetchCount() {
      try {
        const params = new URLSearchParams();
        // Count students matching criteria
        const res = await fetch(`/api/students`);
        if (!res.ok) return;
        const allStudents: { id: string; department: { id: string } | null; semester: number | null }[] = await res.json();

        const deptIds = allowedDepartmentIds;
        const sems = allowedSemesters;
        const stuIds = allowedStudentIds;

        if (deptIds.length === 0 && sems.length === 0 && stuIds.length === 0) {
          setEligibleCount(allStudents.length);
          return;
        }

        const count = allStudents.filter((s) => {
          if (stuIds.includes(s.id)) return true;
          const deptMatch = deptIds.length === 0 || (s.department?.id != null && deptIds.includes(s.department.id));
          const semMatch = sems.length === 0 || (s.semester != null && sems.includes(s.semester));
          return deptMatch && semMatch;
        }).length;
        setEligibleCount(count);
      } catch {
        // ignore
      }
    }
    if (!isLoading) fetchCount();
  }, [allowedDepartmentIds, allowedSemesters, allowedStudentIds, isLoading]);

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
              <Button type="button" variant="outline" asChild>
                <Link
                  href={`/college/drives/${params.driveId}/tests/${params.testId}/monitor`}
                >
                  <Eye />
                  Live Monitor
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    <Trash2 />
                    Delete Test
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Test</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this test and all its
                      questions and attempts. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTest}
                      disabled={isDeletingTest}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingTest && <Loader2 className="animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Eligibility Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Eligibility
          </CardTitle>
          <CardDescription>
            Restrict which students can take this test. Leave all empty to allow all students.
            {eligibleCount !== null && (
              <span className="ml-2 font-medium text-foreground">
                ({eligibleCount} student{eligibleCount !== 1 ? "s" : ""} eligible)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Departments */}
          <div className="space-y-3">
            <Label>Departments</Label>
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments configured.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {departments.map((dept) => (
                  <label
                    key={dept.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={allowedDepartmentIds.includes(dept.id)}
                      onCheckedChange={(checked) => {
                        setAllowedDepartmentIds((prev) =>
                          checked
                            ? [...prev, dept.id]
                            : prev.filter((id) => id !== dept.id)
                        );
                      }}
                    />
                    {dept.name}
                    {dept.code && (
                      <span className="text-muted-foreground">({dept.code})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Semesters */}
          <div className="space-y-3">
            <Label>Semesters</Label>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <label
                  key={sem}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={allowedSemesters.includes(sem)}
                    onCheckedChange={(checked) => {
                      setAllowedSemesters((prev) =>
                        checked
                          ? [...prev, sem]
                          : prev.filter((s) => s !== sem)
                      );
                    }}
                  />
                  Sem {sem}
                </label>
              ))}
            </div>
          </div>

          {/* Specific Students */}
          <div className="space-y-3">
            <Label>Specific Students</Label>
            <p className="text-xs text-muted-foreground">
              These students are always eligible regardless of department or semester filters.
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or USN..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search Results Dropdown */}
            {studentSearch && (
              <div className="rounded-md border max-h-48 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    <Loader2 className="size-4 animate-spin inline mr-2" />
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No students found.
                  </div>
                ) : (
                  searchResults.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                      onClick={() => {
                        setAllowedStudentIds((prev) => [...prev, student.id]);
                        setSelectedStudents((prev) => [...prev, student]);
                        setStudentSearch("");
                        setSearchResults([]);
                      }}
                    >
                      <span>
                        {student.name}
                        {student.usn && (
                          <span className="text-muted-foreground ml-2">
                            {student.usn}
                          </span>
                        )}
                      </span>
                      {student.department && (
                        <span className="text-xs text-muted-foreground">
                          {student.department.name}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Students */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <Badge key={student.id} variant="secondary" className="gap-1">
                    {student.name}
                    {student.usn && ` (${student.usn})`}
                    <button
                      type="button"
                      onClick={() => {
                        setAllowedStudentIds((prev) =>
                          prev.filter((id) => id !== student.id)
                        );
                        setSelectedStudents((prev) =>
                          prev.filter((s) => s.id !== student.id)
                        );
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
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
