"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Download, Loader2, Upload, AlertTriangle } from "lucide-react";
import {
  parseStudentsCSV,
  generateStudentCSVTemplate,
  type CSVStudent,
} from "@/lib/student-csv-parser";
import type { CSVParseError } from "@/lib/csv-parser";

type Phase = "loading" | "select" | "preview" | "uploading";

interface UsnStructure {
  configured: boolean;
  usnFormat?: string;
  usnDeptStart?: number;
  usnDeptLength?: number;
}

export default function StudentUploadPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [usnStructure, setUsnStructure] = useState<UsnStructure | null>(null);
  const [students, setStudents] = useState<CSVStudent[]>([]);
  const [errors, setErrors] = useState<CSVParseError[]>([]);

  useEffect(() => {
    async function fetchUsnStructure() {
      try {
        const res = await fetch("/api/colleges/usn-structure");
        if (!res.ok) throw new Error("Failed to fetch USN structure");
        const data: UsnStructure = await res.json();
        setUsnStructure(data);
      } catch {
        toast.error("Failed to load USN structure");
      } finally {
        setPhase("select");
      }
    }
    fetchUsnStructure();
  }, []);

  function handleDownloadTemplate() {
    if (!usnStructure?.usnFormat) return;
    const csv = generateStudentCSVTemplate(usnStructure.usnFormat);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !usnStructure?.usnFormat) return;

    const text = await file.text();
    const result = parseStudentsCSV(
      text,
      usnStructure.usnFormat,
      usnStructure.usnDeptStart!,
      usnStructure.usnDeptLength!
    );
    setStudents(result.students);
    setErrors(result.errors);
    setPhase("preview");
  }

  async function handleUpload() {
    if (students.length === 0) return;
    setPhase("uploading");

    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      let message = `${data.created} student${data.created !== 1 ? "s" : ""} created`;
      if (data.skipped > 0) message += `, ${data.skipped} skipped (already exist)`;
      if (data.errors?.length > 0) message += `, ${data.errors.length} errors`;

      toast.success(message);

      if (data.errors?.length > 0) {
        for (const err of data.errors.slice(0, 5)) {
          toast.error(err);
        }
      }

      router.push("/college/students");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
      setPhase("preview");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/college/students">
            <ArrowLeft />
            Back to Students
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Bulk Upload Students
        </h1>
        <p className="text-muted-foreground">
          Upload student accounts from a CSV file.
        </p>
      </div>

      {/* Phase 1: File Selection */}
      {phase === "select" && (
        <>
          {!usnStructure?.configured ? (
            <Card className="max-w-2xl border-amber-500">
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertTriangle className="size-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">USN Structure Not Configured</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The super admin needs to configure the USN structure for your
                    college before students can be uploaded via CSV. Contact your
                    super admin to set this up.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file with student details. Download the template
                  to see the expected format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4 text-sm text-muted-foreground space-y-3">
                  <p className="font-medium text-foreground">CSV Format</p>
                  <ul className="space-y-1.5 text-[13px]">
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">name</code>
                      {" "}&mdash; student&apos;s full name
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">email</code>
                      {" "}&mdash; unique email address
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">usn</code>
                      {" "}&mdash; University Seat Number (must be{" "}
                      {usnStructure.usnFormat!.length} characters, e.g.{" "}
                      <code className="bg-muted px-1 rounded text-xs">
                        {usnStructure.usnFormat}
                      </code>
                      )
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">semester</code>
                      {" "}&mdash; current semester (1&ndash;8)
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">password</code>
                      {" "}&mdash; initial password (min 8 characters, can be shared per department)
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Department is auto-extracted from USN positions{" "}
                    {usnStructure.usnDeptStart}&ndash;
                    {usnStructure.usnDeptStart! + usnStructure.usnDeptLength! - 1}.
                    Make sure departments have matching codes configured.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download />
                    Download Template
                  </Button>
                  <Button asChild>
                    <label className="cursor-pointer">
                      <Upload />
                      Select CSV File
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Phase 2: Preview */}
      {phase === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="default">{students.length} valid</Badge>
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length} errors</Badge>
            )}
          </div>

          {errors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-destructive text-base">
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {errors.map((err, i) => (
                    <li key={i} className="text-destructive">
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {students.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Dept Code</TableHead>
                    <TableHead>Semester</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell className="font-mono">{s.usn}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.deptCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Sem {s.semester}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setPhase("select");
                setStudents([]);
                setErrors([]);
              }}
            >
              Choose Different File
            </Button>
            <Button
              onClick={handleUpload}
              disabled={students.length === 0}
            >
              <Upload />
              Upload {students.length} Student
              {students.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Phase 3: Uploading */}
      {phase === "uploading" && (
        <Card className="max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Creating {students.length} student account
                {students.length !== 1 ? "s" : ""}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
