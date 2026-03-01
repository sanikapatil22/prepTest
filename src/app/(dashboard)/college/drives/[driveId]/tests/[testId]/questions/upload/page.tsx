"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  parseQuestionsCSV,
  generateCSVTemplate,
  type CSVQuestion,
  type CSVParseError,
} from "@/lib/csv-parser";

type Phase = "select" | "preview" | "uploading";

export default function BulkUploadPage() {
  const params = useParams<{ driveId: string; testId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("select");
  const [questions, setQuestions] = useState<CSVQuestion[]>([]);
  const [errors, setErrors] = useState<CSVParseError[]>([]);

  function handleDownloadTemplate() {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = parseQuestionsCSV(text);
    setQuestions(result.questions);
    setErrors(result.errors);
    setPhase("preview");
  }

  async function handleUpload() {
    if (questions.length === 0) return;
    setPhase("uploading");

    try {
      const res = await fetch(
        `/api/tests/${params.testId}/questions/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      toast.success(`${data.created} questions uploaded successfully`);
      router.push(
        `/college/drives/${params.driveId}/tests/${params.testId}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
      setPhase("preview");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link
            href={`/college/drives/${params.driveId}/tests/${params.testId}`}
          >
            <ArrowLeft />
            Back to Test
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          Bulk Upload Questions
        </h1>
        <p className="text-muted-foreground">
          Upload MCQ questions from a CSV file.
        </p>
      </div>

      {/* Phase 1: File Selection */}
      {phase === "select" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with your questions. Download the template to
              see the expected format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 text-sm text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">CSV Format</p>
              <ul className="space-y-1.5 text-[13px]">
                <li>
                  <code className="bg-muted px-1 rounded text-xs">option_1</code>{" "}
                  to{" "}
                  <code className="bg-muted px-1 rounded text-xs">option_4</code>{" "}
                  &mdash; min 2, leave extras blank
                </li>
                <li>
                  <code className="bg-muted px-1 rounded text-xs">correct_answers</code>{" "}
                  &mdash; option number(s), e.g.{" "}
                  <code className="bg-muted px-1 rounded text-xs">2</code> or{" "}
                  <code className="bg-muted px-1 rounded text-xs">1;3;5</code>
                </li>
                <li>
                  <code className="bg-muted px-1 rounded text-xs">question_type</code>{" "}
                  &mdash;{" "}
                  <code className="bg-muted px-1 rounded text-xs">SINGLE_SELECT</code>{" "}
                  (default) or{" "}
                  <code className="bg-muted px-1 rounded text-xs">MULTI_SELECT</code>
                </li>
                <li>
                  <code className="bg-muted px-1 rounded text-xs">marks</code>{" "}
                  &mdash; default 1 &nbsp;|&nbsp;{" "}
                  <code className="bg-muted px-1 rounded text-xs">negative_marks</code>{" "}
                  &mdash; default 0
                </li>
                <li>
                  <code className="bg-muted px-1 rounded text-xs">explanation</code>{" "}
                  &mdash; optional
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Download the template to see a working example.
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

          {questions.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Options</TableHead>
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
                          {q.questionType === "SINGLE_SELECT"
                            ? "Single"
                            : "Multi"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {q.options.length}
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
            <Button
              onClick={handleUpload}
              disabled={questions.length === 0}
            >
              <Upload />
              Upload {questions.length} Question
              {questions.length !== 1 ? "s" : ""}
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
                Uploading {questions.length} question
                {questions.length !== 1 ? "s" : ""}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
