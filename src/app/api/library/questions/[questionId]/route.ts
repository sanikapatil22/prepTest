import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { QuestionType, Difficulty } from "@/generated/prisma/client";

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const testCaseSchema = z.object({
  id: z.string().optional(),
  input: z.string(),
  expectedOutput: z.string().min(1, "Expected output is required"),
  isSample: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

const updateSchema = z.object({
  questionText: z.string().min(1).optional(),
  questionType: z.nativeEnum(QuestionType).optional(),
  options: z.array(optionSchema).min(2).optional(),
  correctOptionIds: z.array(z.string()).min(1).optional(),
  testCases: z.array(testCaseSchema).optional(),
  marks: z.number().int().positive().optional(),
  negativeMarks: z.number().min(0).optional(),
  explanation: z.string().optional(),
  category: z.string().min(1).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
});

type RouteParams = { params: Promise<{ questionId: string }> };

function canAccess(
  userRole: string,
  userCollegeId: string | null,
  questionCollegeId: string | null
): boolean {
  if (userRole === "SUPER_ADMIN") return true;
  if (userRole === "COLLEGE_ADMIN") {
    // College admin can access global questions and their own private questions
    return questionCollegeId === null || questionCollegeId === userCollegeId;
  }
  return false;
}

// GET /api/library/questions/[questionId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { questionId } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role: string; collegeId: string | null };
    if (user.role !== "SUPER_ADMIN" && user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const question = await prisma.libraryQuestion.findUnique({
      where: { id: questionId },
      include: {
        testCases: { orderBy: { order: "asc" } },
        createdBy: { select: { name: true } },
        college: { select: { name: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!canAccess(user.role, user.collegeId, question.collegeId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error("GET /api/library/questions/[questionId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/library/questions/[questionId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { questionId } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role: string; collegeId: string | null };
    if (user.role !== "SUPER_ADMIN" && user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.libraryQuestion.findUnique({ where: { id: questionId } });
    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!canAccess(user.role, user.collegeId, existing.collegeId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const questionType = data.questionType ?? existing.questionType;
    const isCoding = questionType === "CODING";

    const question = await prisma.$transaction(async (tx) => {
      const updated = await tx.libraryQuestion.update({
        where: { id: questionId },
        data: {
          ...(data.questionText !== undefined && { questionText: data.questionText }),
          ...(data.questionType !== undefined && { questionType: data.questionType }),
          ...(data.options !== undefined && { options: data.options }),
          ...(data.correctOptionIds !== undefined && { correctOptionIds: data.correctOptionIds }),
          ...(data.marks !== undefined && { marks: data.marks }),
          ...(data.negativeMarks !== undefined && { negativeMarks: data.negativeMarks }),
          ...(data.explanation !== undefined && { explanation: data.explanation }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
        },
      });

      if (isCoding && data.testCases !== undefined) {
        await tx.libraryTestCase.deleteMany({ where: { libraryQuestionId: questionId } });
        await tx.libraryTestCase.createMany({
          data: data.testCases.map((tc, idx) => ({
            libraryQuestionId: questionId,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample ?? false,
            order: tc.order ?? idx,
          })),
        });
      }

      return tx.libraryQuestion.findUnique({
        where: { id: questionId },
        include: { testCases: { orderBy: { order: "asc" } } },
      });
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("PUT /api/library/questions/[questionId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/library/questions/[questionId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { questionId } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role: string; collegeId: string | null };
    if (user.role !== "SUPER_ADMIN" && user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.libraryQuestion.findUnique({ where: { id: questionId } });
    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!canAccess(user.role, user.collegeId, existing.collegeId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.libraryQuestion.delete({ where: { id: questionId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/library/questions/[questionId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
