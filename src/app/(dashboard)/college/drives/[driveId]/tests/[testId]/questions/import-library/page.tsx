"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, Loader2, Search, BookOpen } from "lucide-react";

interface LibraryQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string;
  difficulty: string;
  marks: number;
}

interface PaginatedResponse {
  questions: LibraryQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const difficultyColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

export default function ImportLibraryPage() {
  const params = useParams<{ driveId: string; testId: string }>();
  const router = useRouter();

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("scope", "all");
      if (search) searchParams.set("search", search);
      if (category) searchParams.set("category", category);
      if (difficulty) searchParams.set("difficulty", difficulty);
      if (type) searchParams.set("type", type);
      searchParams.set("page", page.toString());
      searchParams.set("limit", "20");

      const res = await fetch(`/api/library/questions?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      setData(await res.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  }, [search, category, difficulty, type, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetch("/api/library/categories?scope=all")
      .then((res) => res.json())
      .then((cats: string[]) => setCategories(cats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, category, difficulty, type]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    const allIds = data.questions.map((q) => q.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleImport() {
    if (selectedIds.size === 0) return;
    setIsImporting(true);

    try {
      const res = await fetch("/api/library/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: params.testId,
          questionIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Import failed");
      }

      const result = await res.json();
      toast.success(`${result.imported} question${result.imported !== 1 ? "s" : ""} imported`);
      router.push(`/college/drives/${params.driveId}/tests/${params.testId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsImporting(false);
    }
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
        <h1 className="text-3xl font-bold tracking-tight text-balance">Import from Library</h1>
        <p className="text-muted-foreground">
          Select questions from the shared library to add to this test.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulty</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SINGLE_SELECT">Single Select</SelectItem>
                <SelectItem value="MULTI_SELECT">Multi Select</SelectItem>
                <SelectItem value="CODING">Coding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Import bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
          <p className="text-sm font-medium">
            {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <BookOpen />
            )}
            Import Selected
          </Button>
        </div>
      )}

      {/* Questions Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        data !== null &&
                        data.questions.length > 0 &&
                        data.questions.every((q) => selectedIds.has(q.id))
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-center">Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No questions found in the library.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(q.id)}
                          onCheckedChange={() => toggleSelection(q.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {q.questionText.length > 80
                          ? q.questionText.substring(0, 80) + "..."
                          : q.questionText}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {q.questionType === "CODING"
                            ? "Coding"
                            : q.questionType === "SINGLE_SELECT"
                              ? "Single"
                              : "Multi"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{q.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={difficultyColor[q.difficulty] ?? "secondary"}>
                          {q.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{q.marks}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(data.page - 1) * data.limit + 1}–
                {Math.min(data.page * data.limit, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
