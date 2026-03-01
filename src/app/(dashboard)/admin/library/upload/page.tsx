"use client";

import { useState } from "react";
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
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import {
  parseLibraryQuestionsCSV,
  generateLibraryCSVTemplate,
  type LibraryCSVQuestion,
} from "@/lib/library-csv-parser";
import type { CSVParseError } from "@/lib/csv-parser";

type Phase = "select" | "preview" | "uploading";

const difficultyColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

export default function LibraryBulkUploadPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("select");
  const [questions, setQuestions] = useState<LibraryCSVQuestion[]>([]);
  const [errors, setErrors] = useState<CSVParseError[]>([]);

  function handleDownloadTemplate() {
    const csv = generateLibraryCSVTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "library_questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
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
        body: JSON.stringify({ questions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      toast.success(`${data.created} questions uploaded to library`);
      router.push("/admin/library");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setPhase("preview");
    }
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
        <h1 className="text-3xl font-bold tracking-tight text-balance">Bulk Upload Questions</h1>
        <p className="text-muted-foreground">
          Upload MCQ questions to the library from a CSV file.
        </p>
      </div>

      {/* Phase 1: File Selection */}
      {phase === "select" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with your questions. Download the template to see the expected format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 text-sm text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">CSV Format</p>
              <ul className="space-y-1.5 text-[13px]">
                <li>
                  Same columns as test CSV, plus{" "}
                  <code className="bg-muted px-1 rounded text-xs">category</code> (required) and{" "}
                  <code className="bg-muted px-1 rounded text-xs">difficulty</code> (EASY/MEDIUM/HARD, default MEDIUM)
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
                <li>
                  <code className="bg-muted px-1 rounded text-xs">question_type</code> &mdash;{" "}
                  <code className="bg-muted px-1 rounded text-xs">SINGLE_SELECT</code> (default) or{" "}
                  <code className="bg-muted px-1 rounded text-xs">MULTI_SELECT</code>
                </li>
              </ul>
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

      {/* Phase 2: Preview */}
      {phase === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="default">{questions.length} valid</Badge>
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length} errors</Badge>
            )}
          </div>

          {errors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-destructive text-base">Errors</CardTitle>
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

          {questions.length > 0 && (
            <div className="rounded-md border">
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
                        {q.questionText.length > 80
                          ? q.questionText.substring(0, 80) + "..."
                          : q.questionText}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {q.questionType === "SINGLE_SELECT" ? "Single" : "Multi"}
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
                setQuestions([]);
                setErrors([]);
              }}
            >
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
