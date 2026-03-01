import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { isStudentEligible } from "@/lib/test-eligibility";

type RouteParams = { params: Promise<{ testId: string }> };

// POST /api/tests/[testId]/start — student starts a test attempt
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as {
      id: string;
      role: string;
      collegeId: string | null;
    };

    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can start tests" },
        { status: 403 }
      );
    }

    const { testId } = await params;

    // Fetch the test and verify it's published
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        drive: { select: { collegeId: true } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Verify test belongs to student's college
    if (test.drive.collegeId !== user.collegeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check eligibility
    const student = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, departmentId: true, semester: true },
    });

    if (
      !student ||
      !isStudentEligible(test, student)
    ) {
      return NextResponse.json(
        { error: "You are not eligible for this test" },
        { status: 403 }
      );
    }

    // Verify test is published
    if (test.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Test is not available for taking" },
        { status: 400 }
      );
    }

    // Check time window if set
    const now = new Date();
    if (test.startTime && now < test.startTime) {
      return NextResponse.json(
        { error: "Test has not started yet" },
        { status: 400 }
      );
    }
    if (test.endTime && now > test.endTime) {
      return NextResponse.json(
        { error: "Test has ended" },
        { status: 400 }
      );
    }

    // Check for existing attempt (one per student per test)
    const existingAttempt = await prisma.testAttempt.findUnique({
      where: {
        testId_studentId: {
          testId,
          studentId: user.id,
        },
      },
    });

    if (existingAttempt) {
      // If in progress, return the existing attempt
      if (existingAttempt.status === "IN_PROGRESS") {
        return NextResponse.json(existingAttempt);
      }
      // If already submitted or timed out, cannot retake
      return NextResponse.json(
        { error: "You have already attempted this test" },
        { status: 409 }
      );
    }

    // Create new attempt
    try {
      const attempt = await prisma.testAttempt.create({
        data: {
          testId,
          studentId: user.id,
          status: "IN_PROGRESS",
          totalMarks: test.totalMarks,
        },
      });

      return NextResponse.json(attempt, { status: 201 });
    } catch (createError: unknown) {
      // Handle race condition: if another request created the attempt first
      if (
        typeof createError === "object" &&
        createError !== null &&
        "code" in createError &&
        (createError as { code: string }).code === "P2002"
      ) {
        const existing = await prisma.testAttempt.findUnique({
          where: { testId_studentId: { testId, studentId: user.id } },
        });
        if (existing?.status === "IN_PROGRESS") {
          return NextResponse.json(existing);
        }
        return NextResponse.json(
          { error: "You have already attempted this test" },
          { status: 409 }
        );
      }
      throw createError;
    }
  } catch (error) {
    console.error("POST /api/tests/[testId]/start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
