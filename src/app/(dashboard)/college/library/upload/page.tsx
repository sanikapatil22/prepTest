"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ArrowLeft, Download, Globe, Loader2, Lock, Upload } from "lucide-react";
import {
  parseLibraryQuestionsCSV,
  generateLibraryCSVTemplate,
  type LibraryCSVQuestion,
} from "@/lib/library-csv-parser";
import type { CSVParseError } from "@/lib/csv-parser";
import { fileToCSVText } from "@/lib/spreadsheet";

type Phase = "select" | "preview" | "uploading";

const difficultyColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

export default function CollegeLibraryBulkUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopeParam = searchParams.get("scope") === "private" ? "private" : "global";

  const [phase, setPhase] = useState<Phase>("select");
  const [questions, setQuestions] = useState<LibraryCSVQuestion[]>([]);
  const [errors, setErrors] = useState<CSVParseError[]>([]);
  const [scope, setScope] = useState<"global" | "private">(scopeParam as "global" | "private");

  async function handleDownloadTemplate(format: "csv" | "xlsx") {
    const csv = generateLibraryCSVTemplate();
    if (format === "xlsx") {
      const { utils, writeFile } = await import("xlsx");
      const rows = csv.trim().split("\n").map((line) =>
        line.split(",").map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"'))
      );
      const ws = utils.aoa_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Questions");
      writeFile(wb, "library_questions_template.xlsx");
    } else {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "library_questions_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await fileToCSVText(file);
    const result = parseLibraryQuestionsCSV(text);
    setQuestions(result.questions);
    setErrors(result.errors);
    setPhase("preview");
  }

  async function handleUpload() {
    if (questions.length === 0) return;
    setPhase("uploading");
    try {
      const res = await fetch("/api/library/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, scope }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      toast.success(`${data.created} questions uploaded to library`);
      router.push(`/college/library?scope=${scope}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setPhase("preview");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/college/library?scope=${scope}`}>
            <ArrowLeft />
            Back to Library
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Bulk Upload Questions</h1>
        <p className="text-muted-foreground">
          Upload MCQ questions to the {scope} library from a CSV file.
        </p>
      </div>

      {/* Phase 1: File Selection */}
      {phase === "select" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload a CSV or Excel (.xlsx) file with your questions. Download the template to see the expected format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scope selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Library Scope</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scope === "global" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScope("global")}
                >
                  <Globe className="size-3.5 mr-1.5" />
                  Global
                </Button>
                <Button
                  type="button"
                  variant={scope === "private" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScope("private")}
                >
                  <Lock className="size-3.5 mr-1.5" />
                  Private
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {scope === "global"
                  ? "Global questions are visible to all college admins."
                  : "Private questions are only visible to your college."}
              </p>
            </div>

            <div className="rounded-md border p-4 text-sm text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">CSV Format</p>
              <ul className="space-y-1.5 text-[13px]">
                <li>
                  Same columns as test CSV, plus{" "}
                  <code className="bg-muted px-1 rounded text-xs">category</code> (required) and{" "}
                  <code className="bg-muted px-1 rounded text-xs">difficulty</code> (required: EASY, MEDIUM, or HARD)
                </li>
                <li>
                  <code className="bg-muted px-1 rounded text-xs">option_1</code> to{" "}
                  <code className="bg-muted px-1 rounded text-xs">option_4</code> &mdash; min 2, leave extras blank
                </li>
                <li>
                  <code className="bg-muted px-1 rounded text-xs">correct_answers</code> &mdash; option number(s), e.g.{" "}
                  <code className="bg-muted px-1 rounded text-xs">2</code> or{" "}
                  <code className="bg-muted px-1 rounded text-xs">1;3</code>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => handleDownloadTemplate("csv")}>
                <Download />
                Template (.csv)
              </Button>
              <Button variant="outline" onClick={() => handleDownloadTemplate("xlsx")}>
                <Download />
                Template (.xlsx)
              </Button>
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload />
                  Select File
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Preview */}
      {phase === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="default">{questions.length} valid</Badge>
            {errors.length > 0 && <Badge variant="destructive">{errors.length} errors</Badge>}
            <Badge variant="outline" className="gap-1">
              {scope === "global" ? <Globe className="size-3" /> : <Lock className="size-3" />}
              {scope === "global" ? "Global" : "Private"}
            </Badge>
          </div>

          {errors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-destructive text-base">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {errors.map((err, i) => (
                    <li key={i} className="text-destructive">Row {err.row}: {err.message}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {questions.length > 0 && (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {q.questionText.length > 80 ? q.questionText.substring(0, 80) + "..." : q.questionText}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {q.questionType === "SINGLE_SELECT" ? "Single" : "Multi"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{q.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={difficultyColor[q.difficulty] ?? "secondary"}>{q.difficulty}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{q.marks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setPhase("select"); setQuestions([]); setErrors([]); }}>
              Choose Different File
            </Button>
            <Button onClick={handleUpload} disabled={questions.length === 0}>
              <Upload />
              Upload {questions.length} Question{questions.length !== 1 ? "s" : ""}
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
                Uploading {questions.length} question{questions.length !== 1 ? "s" : ""}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
