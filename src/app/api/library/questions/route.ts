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
  input: z.string(),
  expectedOutput: z.string().min(1, "Expected output is required"),
  isSample: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

const mcqSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(["SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(optionSchema).min(2, "At least 2 options are required"),
  correctOptionIds: z.array(z.string()).min(1, "At least 1 correct option is required"),
  marks: z.number().int().positive().default(1),
  negativeMarks: z.number().min(0).default(0),
  explanation: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  difficulty: z.nativeEnum(Difficulty).default("MEDIUM"),
});

const codingSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.literal("CODING"),
  testCases: z.array(testCaseSchema).min(1, "At least 1 test case is required"),
  marks: z.number().int().positive().default(1),
  negativeMarks: z.number().min(0).default(0),
  explanation: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  difficulty: z.nativeEnum(Difficulty).default("MEDIUM"),
});

const createSchema = z.discriminatedUnion("questionType", [
  mcqSchema.extend({ questionType: z.literal("SINGLE_SELECT") }),
  mcqSchema.extend({ questionType: z.literal("MULTI_SELECT") }),
  codingSchema,
]);

// GET /api/library/questions — list library questions with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; collegeId: string | null };
    if (user.role !== "SUPER_ADMIN" && user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const scope = searchParams.get("scope"); // "public", "private", "all"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (difficulty && Object.values(Difficulty).includes(difficulty as Difficulty)) {
      where.difficulty = difficulty;
    }
    if (type && Object.values(QuestionType).includes(type as QuestionType)) {
      where.questionType = type;
    }
    if (search) {
      where.questionText = { contains: search, mode: "insensitive" };
    }

    // Scope-based filtering for public/private library sections
    if (user.role === "SUPER_ADMIN") {
      if (scope === "all") {
        // Show all questions — no collegeId filter
      } else {
        // Default: show only public questions (collegeId: null)
        where.collegeId = null;
      }
    } else if (user.role === "COLLEGE_ADMIN") {
      if (scope === "private") {
        where.collegeId = user.collegeId;
      } else if (scope === "all") {
        where.OR = [{ collegeId: null }, { collegeId: user.collegeId }];
      } else {
        // Default (scope=public or no scope): show only public
        where.collegeId = null;
      }
    }

    const [questions, total] = await Promise.all([
      prisma.libraryQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { name: true } },
          testCases: true,
        },
      }),
      prisma.libraryQuestion.count({ where }),
    ]);

    return NextResponse.json({
      questions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/library/questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/library/questions — create a library question
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; collegeId: string | null };
    if (user.role !== "SUPER_ADMIN" && user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const isCoding = data.questionType === "CODING";

    // Validate correctOptionIds for MCQ
    if (!isCoding) {
      const d = data as z.infer<typeof mcqSchema>;
      const optionIds = d.options.map((o) => o.id);
      const invalidIds = d.correctOptionIds.filter((id) => !optionIds.includes(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "Invalid correct option IDs", details: `These IDs are not in options: ${invalidIds.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // SUPER_ADMIN creates public questions (collegeId: null)
    // COLLEGE_ADMIN creates private questions (collegeId: user.collegeId)
    const collegeId = user.role === "COLLEGE_ADMIN" ? user.collegeId : null;

    const question = await prisma.$transaction(async (tx) => {
      const created = await tx.libraryQuestion.create({
        data: {
          questionText: data.questionText,
          questionType: data.questionType as QuestionType,
          options: isCoding ? [] : (data as z.infer<typeof mcqSchema>).options,
          correctOptionIds: isCoding ? [] : (data as z.infer<typeof mcqSchema>).correctOptionIds,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          explanation: data.explanation,
          category: data.category,
          difficulty: data.difficulty,
          createdById: user.id,
          collegeId,
        },
        include: { testCases: true },
      });

      if (isCoding) {
        const codingData = data as z.infer<typeof codingSchema>;
        await tx.libraryTestCase.createMany({
          data: codingData.testCases.map((tc, idx) => ({
            libraryQuestionId: created.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample ?? false,
            order: tc.order ?? idx,
          })),
        });

        return tx.libraryQuestion.findUnique({
          where: { id: created.id },
          include: { testCases: true },
        });
      }

      return created;
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("POST /api/library/questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
