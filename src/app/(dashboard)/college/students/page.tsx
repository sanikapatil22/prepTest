"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  Trash2,
  Pencil,
  Search,
  ArrowUpCircle,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 15;

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

interface Department {
  id: string;
  name: string;
  code: string | null;
}

interface Student {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  semester: number | null;
  isGraduated: boolean;
  department: { id: string; name: string; code: string | null } | null;
  createdAt: string;
  testsTaken: number;
  averageScore: number | null;
}

interface EditForm {
  name: string;
  email: string;
  usn: string;
  semester: string;
  departmentId: string;
}

export default function StudentsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFilteredDialogOpen, setDeleteFilteredDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSingleStudent, setDeleteSingleStudent] = useState<Student | null>(null);

  // Derive filter state from URL
  const departmentFilter = searchParams.get("dept") ?? "all";
  const semesterFilter = searchParams.get("sem") ?? "all";
  const graduatedFilter = searchParams.get("graduated") ?? "all";
  const usnSearch = searchParams.get("q") ?? "";

  const [currentPage, setCurrentPage] = useState(1);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`?${params.toString()}`);
    setCurrentPage(1);
  }

  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteFilteredDialogOpen, setPromoteFilteredDialogOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    usn: "",
    semester: "none",
    departmentId: "none",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelected(new Set());
    fetchStudents();
  }, [departmentFilter, semesterFilter, graduatedFilter]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== "all")
        params.set("departmentId", departmentFilter);
      if (semesterFilter !== "all") params.set("semester", semesterFilter);
      if (graduatedFilter !== "all") params.set("graduated", graduatedFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        toast.error(data.error || "Failed to load students");
      }
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredStudents.map((s) => s.id)));
    }
  }

  async function handleBulkDelete(ids: string[]) {
    setDeleting(true);
    try {
      const res = await fetch("/api/students/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Deleted ${data.deleted} student${data.deleted !== 1 ? "s" : ""}`
        );
        setSelected(new Set());
        fetchStudents();
      } else {
        toast.error(data.error || "Failed to delete students");
      }
    } catch {
      toast.error("Failed to delete students");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteFilteredDialogOpen(false);
      setDeleteSingleStudent(null);
    }
  }

  async function handleBulkPromote(ids: string[]) {
    setPromoting(true);
    try {
      const res = await fetch("/api/students/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids }),
      });
      const data = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if (data.promoted > 0) parts.push(`${data.promoted} promoted`);
        if (data.graduated > 0) parts.push(`${data.graduated} graduated`);
        toast.success(parts.join(", ") || "No eligible students to promote");
        setSelected(new Set());
        fetchStudents();
      } else {
        toast.error(data.error || "Failed to promote students");
      }
    } catch {
      toast.error("Failed to promote students");
    } finally {
      setPromoting(false);
      setPromoteDialogOpen(false);
      setPromoteFilteredDialogOpen(false);
    }
  }

  function openEditDialog(student: Student) {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      email: student.email,
      usn: student.usn || "",
      semester: student.semester ? String(student.semester) : "none",
      departmentId: student.department?.id || "none",
    });
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!editingStudent) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (editForm.name !== editingStudent.name) payload.name = editForm.name;
      if (editForm.email !== editingStudent.email)
        payload.email = editForm.email;

      const newUsn = editForm.usn || null;
      if (newUsn !== editingStudent.usn) payload.usn = newUsn;

      const newSemester =
        editForm.semester !== "none" ? parseInt(editForm.semester, 10) : null;
      if (newSemester !== editingStudent.semester)
        payload.semester = newSemester;

      const newDeptId =
        editForm.departmentId !== "none" ? editForm.departmentId : null;
      if (newDeptId !== (editingStudent.department?.id || null))
        payload.departmentId = newDeptId;

      if (Object.keys(payload).length === 0) {
        setEditDialogOpen(false);
        return;
      }

      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Student updated successfully");
        setEditDialogOpen(false);
        fetchStudents();
      } else {
        toast.error(data.error || "Failed to update student");
      }
    } catch {
      toast.error("Failed to update student");
    } finally {
      setSaving(false);
    }
  }

  // Client-side USN search filter
  const filteredStudents = usnSearch
    ? students.filter((s) =>
        s.usn?.toLowerCase().includes(usnSearch.toLowerCase())
      )
    : students;

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedStudents = filteredStudents.slice(startIdx, startIdx + PAGE_SIZE);

  const allSelected =
    filteredStudents.length > 0 && selected.size === filteredStudents.length;
  const someSelected =
    selected.size > 0 && selected.size < filteredStudents.length;
  const hasActiveFilter =
    departmentFilter !== "all" ||
    semesterFilter !== "all" ||
    usnSearch !== "" ||
    graduatedFilter !== "all";

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            Students
          </h1>
          <p className="text-sm text-muted-foreground">
            All registered students in your college.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/college/students/upload">
            <Upload className="size-4" aria-hidden="true" />
            Upload Students
          </Link>
        </Button>
      </div>

      {/* Filter bar */}
      <div
        role="group"
        aria-label="Filter students"
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative">
          <Search
            className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search by USN"
            placeholder="Search by USN…"
            value={usnSearch}
            onChange={(e) => {
              setParam("q", e.target.value);
              setSelected(new Set());
            }}
            className="w-[200px] pl-8"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <Select
          value={departmentFilter}
          onValueChange={(v) => {
            setParam("dept", v);
            setSelected(new Set());
          }}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by department">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.code || dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={semesterFilter}
          onValueChange={(v) => {
            setParam("sem", v);
            setSelected(new Set());
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by semester">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <SelectItem key={sem} value={String(sem)}>
                Semester {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={graduatedFilter}
          onValueChange={(v) => {
            setParam("graduated", v);
            setSelected(new Set());
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            <SelectItem value="false">Active</SelectItem>
            <SelectItem value="true">Graduated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {(selected.size > 0 || (hasActiveFilter && filteredStudents.length > 0)) && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-4 py-2"
          aria-live="polite"
        >
          {selected.size > 0 && (
            <>
              <span className="text-sm font-medium tabular-nums">
                {selected.size} student{selected.size !== 1 ? "s" : ""} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete Selected
              </Button>
              <Button size="sm" onClick={() => setPromoteDialogOpen(true)}>
                <ArrowUpCircle className="size-4" aria-hidden="true" />
                Promote Selected
              </Button>
            </>
          )}
          {hasActiveFilter && filteredStudents.length > 0 && (
            <>
              {selected.size > 0 && (
                <span
                  aria-hidden="true"
                  className="mx-1 h-4 w-px shrink-0 bg-border"
                />
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteFilteredDialogOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete Filtered ({filteredStudents.length})
              </Button>
              <Button
                size="sm"
                onClick={() => setPromoteFilteredDialogOpen(true)}
              >
                <ArrowUpCircle className="size-4" aria-hidden="true" />
                Promote Filtered ({filteredStudents.length})
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div
            className="flex h-24 items-center justify-center gap-2"
            aria-live="polite"
          >
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Loading students…</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[48px] px-4">
                  <Checkbox
                    checked={
                      allSelected ? true : someSelected ? "indeterminate" : false
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">USN</TableHead>
                <TableHead className="px-4">Department</TableHead>
                <TableHead className="px-4">Semester</TableHead>
                <TableHead className="px-4 text-center">Tests</TableHead>
                <TableHead className="px-4 text-center">Avg Score</TableHead>
                <TableHead className="px-4">Joined</TableHead>
                <TableHead className="w-[88px] px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={10} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="rounded-full bg-muted p-3">
                        <Users
                          className="size-6 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {usnSearch
                            ? `No students match "${usnSearch}"`
                            : "No students found"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {usnSearch
                            ? "Try a different USN or clear the search."
                            : "Students appear here once they register or are uploaded via CSV."}
                        </p>
                      </div>
                      {!usnSearch && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="mt-1"
                        >
                          <Link href="/college/students/upload">
                            <Upload className="size-4" aria-hidden="true" />
                            Upload Students
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selected.has(student.id)}
                        onCheckedChange={() => toggleSelect(student.id)}
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    <TableCell className="px-4 font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell className="px-4 font-mono text-sm tabular-nums">
                      {student.usn ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      {student.department ? (
                        <Badge variant="outline">
                          {student.department.code || student.department.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      {student.isGraduated ? (
                        <Badge variant="default" className="bg-success">
                          <GraduationCap
                            className="size-3"
                            aria-hidden="true"
                          />
                          Graduated
                        </Badge>
                      ) : student.semester ? (
                        <Badge variant="secondary">
                          Sem {student.semester}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-center tabular-nums">
                      {student.testsTaken}
                    </TableCell>
                    <TableCell className="px-4 text-center tabular-nums">
                      {student.averageScore !== null ? (
                        `${student.averageScore}%`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 tabular-nums text-muted-foreground">
                      {dateFormatter.format(new Date(student.createdAt))}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(student)}
                          aria-label={`Edit ${student.name}`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSingleStudent(student)}
                          aria-label={`Delete ${student.name}`}
                        >
                          <Trash2
                            className="size-4 text-destructive"
                            aria-hidden="true"
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIdx + 1}&ndash;
            {Math.min(startIdx + PAGE_SIZE, filteredStudents.length)} of{" "}
            {filteredStudents.length} students
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage(safePage - 1)}
              disabled={safePage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-3 text-sm font-medium tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage(safePage + 1)}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Selected Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selected.size} student
              {selected.size !== 1 ? "s" : ""} and all their test attempts. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkDelete(Array.from(selected))}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single Student Dialog */}
      <AlertDialog
        open={!!deleteSingleStudent}
        onOpenChange={(open) => {
          if (!open) setDeleteSingleStudent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteSingleStudent?.name}</strong> (
              {deleteSingleStudent?.email}) and all their test attempts. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteSingleStudent)
                  handleBulkDelete([deleteSingleStudent.id]);
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Filtered Dialog */}
      <AlertDialog
        open={deleteFilteredDialogOpen}
        onOpenChange={setDeleteFilteredDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all filtered students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""} matching the current
              filters and all their test attempts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleBulkDelete(filteredStudents.map((s) => s.id))
              }
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Delete All ({filteredStudents.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Selected Dialog */}
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will increment the semester for {selected.size} selected
              student{selected.size !== 1 ? "s" : ""}. Students in semester 8
              will be marked as graduated. Students without a semester or already
              graduated will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkPromote(Array.from(selected))}
              disabled={promoting}
            >
              {promoting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUpCircle className="size-4" aria-hidden="true" />
              )}
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote All Filtered Dialog */}
      <AlertDialog
        open={promoteFilteredDialogOpen}
        onOpenChange={setPromoteFilteredDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote all filtered students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will increment the semester for all {filteredStudents.length}{" "}
              student{filteredStudents.length !== 1 ? "s" : ""} matching the
              current filters. Students in semester 8 will be marked as
              graduated. Students without a semester or already graduated will be
              skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleBulkPromote(filteredStudents.map((s) => s.id))
              }
              disabled={promoting}
            >
              {promoting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUpCircle className="size-4" aria-hidden="true" />
              )}
              Promote All ({filteredStudents.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student&apos;s details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                autoComplete="email"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-usn">USN</Label>
              <Input
                id="edit-usn"
                value={editForm.usn}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, usn: e.target.value }))
                }
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                value={editForm.departmentId}
                onValueChange={(val) =>
                  setEditForm((f) => ({ ...f, departmentId: val }))
                }
              >
                <SelectTrigger id="edit-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.code ? `${dept.code} – ${dept.name}` : dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-semester">Semester</Label>
              <Select
                value={editForm.semester}
                onValueChange={(val) =>
                  setEditForm((f) => ({ ...f, semester: val }))
                }
              >
                <SelectTrigger id="edit-semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Set</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={String(sem)}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
