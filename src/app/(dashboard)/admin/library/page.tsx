"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Upload, Search, Pencil, Tag, Check, X, Globe, Lock } from "lucide-react";

interface LibraryQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string;
  difficulty: string;
  marks: number;
  collegeId: string | null;
  createdBy: { name: string };
  college?: { name: string } | null;
}

interface PaginatedResponse {
  questions: LibraryQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CategoryItem {
  id: string;
  name: string;
  isGlobal: boolean;
}

const difficultyColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

export default function AdminLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Derive filter + pagination state from URL
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const type = searchParams.get("type") ?? "";
  const scope = searchParams.get("scope") ?? "global";
  const page = Number(searchParams.get("page") ?? "1");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== "page") params.delete("page");
    router.replace(`?${params.toString()}`);
  }

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (difficulty) params.set("difficulty", difficulty);
      if (type) params.set("type", type);
      params.set("scope", scope);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/library/questions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const json: PaginatedResponse = await res.json();
      setData(json);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  }, [search, category, difficulty, type, scope, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const fetchCategories = useCallback(() => {
    fetch("/api/library/categories")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((cats: CategoryItem[]) => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const res = await fetch("/api/library/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add category");
      }
      toast.success("Category added");
      setNewCategoryName("");
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsAddingCategory(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    setDeletingCategoryId(categoryId);
    try {
      const res = await fetch(`/api/library/categories/${categoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete category");
      }
      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeletingCategoryId(null);
    }
  }

  function startEditingCategory(cat: CategoryItem) {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  }

  async function handleSaveCategory() {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    setIsSavingCategory(true);
    try {
      const res = await fetch(`/api/library/categories/${editingCategoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update category");
      }
      toast.success("Category updated");
      setEditingCategoryId(null);
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleDelete(questionId: string) {
    setDeletingId(questionId);
    try {
      const res = await fetch(`/api/library/questions/${questionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete question");
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  const isGlobalScope = scope === "global";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Question Library</h1>
          <p className="text-muted-foreground">
            Manage shared questions that college admins can import into tests.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag />
                Categories
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
                <DialogDescription>
                  Add or remove global categories. These are available to all college admins.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                  />
                  <Button onClick={handleAddCategory} disabled={isAddingCategory || !newCategoryName.trim()}>
                    {isAddingCategory ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Add
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No categories yet.</p>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between rounded-md border px-3 py-2 gap-2">
                        {editingCategoryId === cat.id ? (
                          <>
                            <Input
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="h-7 text-sm"
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveCategory(); } if (e.key === "Escape") setEditingCategoryId(null); }}
                              autoFocus
                            />
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSaveCategory} disabled={isSavingCategory || !editingCategoryName.trim()}>
                                {isSavingCategory ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingCategoryId(null)}>
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">{cat.name}</span>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditingCategory(cat)}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 w-7 p-0">
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Delete &quot;{cat.name}&quot;? Existing questions with this category won&apos;t be affected.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteCategory(cat.id)}
                                      disabled={deletingCategoryId === cat.id}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deletingCategoryId === cat.id && <Loader2 className="mr-2 size-4 animate-spin" />}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {isGlobalScope && (
            <>
              <Button variant="outline" asChild>
                <Link href="/admin/library/upload?scope=global">
                  <Upload />
                  Upload CSV
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/library/new?scope=global">
                  <Plus />
                  Add Question
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scope Tabs */}
      <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
        <button
          onClick={() => setParam("scope", "global")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isGlobalScope
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Globe className="size-3.5" />
          Global
        </button>
        <button
          onClick={() => setParam("scope", "private")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !isGlobalScope
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Lock className="size-3.5" />
          Private
        </button>
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
                onChange={(e) => setParam("search", e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={(v) => setParam("category", v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => setParam("difficulty", v)}>
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
            <Select value={type} onValueChange={(v) => setParam("type", v)}>
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
          <div className="rounded-lg border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-center">Marks</TableHead>
                  {!isGlobalScope && <TableHead>College</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGlobalScope ? 7 : 8} className="h-24 text-center text-muted-foreground">
                      {isGlobalScope
                        ? "No global questions found. Add questions to the library."
                        : "No private questions found. Private questions are created by college admins."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.questions.map((q, idx) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">
                        {(data.page - 1) * data.limit + idx + 1}
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
                      {!isGlobalScope && (
                        <TableCell className="text-muted-foreground text-sm">
                          {q.college?.name ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/library/${q.id}`}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
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
                                <AlertDialogTitle>Delete Question</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure? This will permanently remove this question from the library.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(q.id)}
                                  disabled={deletingId === q.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingId === q.id && <Loader2 className="mr-2 size-4 animate-spin" />}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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
                  onClick={() => setParam("page", String(Math.max(1, page - 1)))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParam("page", String(page + 1))}
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
