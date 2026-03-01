import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const bulkQuestionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(["SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(optionSchema).min(2, "At least 2 options are required"),
  correctOptionIds: z
    .array(z.string())
    .min(1, "At least 1 correct option is required"),
  marks: z.number().int().positive(),
  negativeMarks: z.number().min(0),
  explanation: z.string().optional(),
});

const bulkRequestSchema = z.object({
  questions: z
    .array(bulkQuestionSchema)
    .min(1, "At least 1 question is required")
    .max(100, "Maximum 100 questions per upload"),
});

type RouteParams = { params: Promise<{ testId: string }> };

// POST /api/tests/[testId]/questions/bulk — bulk create MCQ questions
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { testId } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as {
      id: string;
      role: string;
      collegeId: string | null;
    };

    if (user.role !== "COLLEGE_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { drive: { select: { collegeId: true } } },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (
      user.role === "COLLEGE_ADMIN" &&
      test.drive.collegeId !== user.collegeId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { questions } = parsed.data;

    // Get current max order
    const lastQuestion = await prisma.question.findFirst({
      where: { testId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const startOrder = (lastQuestion?.order ?? -1) + 1;

    // Create all questions and recalculate total marks in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.question.createMany({
        data: questions.map((q, idx) => ({
          testId,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctOptionIds: q.correctOptionIds,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation,
          order: startOrder + idx,
        })),
      });

      // Recalculate totalMarks
      const allQuestions = await tx.question.findMany({
        where: { testId },
        select: { marks: true },
      });
      const totalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

      await tx.test.update({
        where: { id: testId },
        data: { totalMarks },
      });

      return { created: questions.length, totalMarks };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/tests/[testId]/questions/bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
