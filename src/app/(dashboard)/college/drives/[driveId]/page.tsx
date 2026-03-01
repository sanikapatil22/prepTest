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
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";

interface DriveData {
  id: string;
  title: string;
  description: string | null;
  companyName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  college: { id: string; name: string; code: string };
  _count: { tests: number };
}

interface TestData {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  status: string;
  _count: { questions: number; attempts: number };
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  UPCOMING: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const testStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  CLOSED: "outline",
};

export default function DriveDetailPage() {
  const params = useParams<{ driveId: string }>();
  const router = useRouter();

  const [drive, setDrive] = useState<DriveData | null>(null);
  const [tests, setTests] = useState<TestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("DRAFT");

  useEffect(() => {
    async function fetchData() {
      try {
        const [driveRes, testsRes] = await Promise.all([
          fetch(`/api/drives/${params.driveId}`),
          fetch(`/api/tests?driveId=${params.driveId}`),
        ]);

        if (!driveRes.ok) throw new Error("Failed to fetch drive");

        const driveData: DriveData = await driveRes.json();
        setDrive(driveData);
        setTitle(driveData.title);
        setDescription(driveData.description || "");
        setCompanyName(driveData.companyName || "");
        setStartDate(
          driveData.startDate
            ? new Date(driveData.startDate).toISOString().split("T")[0]
            : ""
        );
        setEndDate(
          driveData.endDate
            ? new Date(driveData.endDate).toISOString().split("T")[0]
            : ""
        );
        setStatus(driveData.status);

        if (testsRes.ok) {
          const testsData: TestData[] = await testsRes.json();
          setTests(testsData);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load drive"
        );
        router.push("/college/drives");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.driveId, router]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/drives/${params.driveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          companyName: companyName || undefined,
          startDate: startDate
            ? new Date(startDate).toISOString()
            : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          status,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update drive");
      }

      toast.success("Drive updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDrive() {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/drives/${params.driveId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete drive");
      }

      toast.success("Drive deleted successfully");
      router.push("/college/drives");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!drive) return null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/college/drives">
            <ArrowLeft />
            Back to Drives
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{drive.title}</h1>
          <Badge variant={statusVariant[drive.status] ?? "secondary"}>
            {drive.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage drive details and associated tests.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Drive</CardTitle>
          <CardDescription>
            Update the drive details below and save your changes.
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
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/college/drives">Cancel</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    <Trash2 />
                    Delete Drive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Drive</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this drive and all its tests,
                      questions, and attempts. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteDrive}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting && <Loader2 className="animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Tests</h2>
            <p className="text-sm text-muted-foreground">
              Tests associated with this drive.
            </p>
          </div>
          <Button asChild>
            <Link href={`/college/drives/${params.driveId}/tests/new`}>
              <Plus />
              Add Test
            </Link>
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-center">Total Marks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No tests yet. Add a test to this drive.
                  </TableCell>
                </TableRow>
              ) : (
                tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{test.durationMinutes} min</TableCell>
                    <TableCell className="text-center">
                      {test.totalMarks}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={testStatusVariant[test.status] ?? "secondary"}
                      >
                        {test.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {test._count.questions}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/college/drives/${params.driveId}/tests/${test.id}`}
                        >
                          View
                          <ArrowRight />
                        </Link>
                      </Button>
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
