import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { hashPassword } from "better-auth/crypto";

const bulkDeleteSchema = z.object({
  studentIds: z.array(z.string()).min(1),
});

// DELETE /api/students/bulk — bulk delete student accounts (COLLEGE_ADMIN only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; collegeId: string };
    if (user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { studentIds } = parsed.data;

    const result = await prisma.user.deleteMany({
      where: {
        id: { in: studentIds },
        collegeId: user.collegeId,
        role: "STUDENT",
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("DELETE /api/students/bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const bulkStudentSchema = z.object({
  students: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      usn: z.string().min(1),
      deptCode: z.string().min(1),
      semester: z.number().int().min(1).max(8),
      password: z.string().min(8),
    })
  ),
});

// POST /api/students/bulk — bulk create student accounts (COLLEGE_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; collegeId: string };
    if (user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { students } = parsed.data;
    const collegeId = user.collegeId;

    // Fetch college's departments
    const departments = await prisma.department.findMany({
      where: { collegeId },
      select: { id: true, code: true, name: true },
    });

    // Build dept code -> department id map (case-insensitive)
    const deptMap = new Map<string, string>();
    for (const dept of departments) {
      if (dept.code) {
        deptMap.set(dept.code.toUpperCase(), dept.id);
      }
    }

    // Check which emails/USNs already exist
    const emails = students.map((s) => s.email.toLowerCase());
    const usns = students.map((s) => s.usn.toUpperCase());

    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: emails } },
          { usn: { in: usns } },
        ],
      },
      select: { email: true, usn: true },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const existingUsns = new Set(
      existingUsers.filter((u) => u.usn).map((u) => u.usn!.toUpperCase())
    );

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Group passwords by unique value to hash each only once
    const uniquePasswords = [...new Set(students.map((s) => s.password))];
    const hashedPasswords = new Map<string, string>();
    for (const pw of uniquePasswords) {
      hashedPasswords.set(pw, await hashPassword(pw));
    }

    for (const student of students) {
      const email = student.email.toLowerCase();
      const usn = student.usn.toUpperCase();
      const deptCode = student.deptCode.toUpperCase();

      if (existingEmails.has(email)) {
        skipped++;
        continue;
      }

      if (existingUsns.has(usn)) {
        errors.push(`USN "${usn}" already exists`);
        continue;
      }

      const departmentId = deptMap.get(deptCode);
      if (!departmentId) {
        errors.push(
          `No department with code "${student.deptCode}" found for USN "${usn}"`
        );
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: student.name,
              email,
              emailVerified: true,
              role: "STUDENT",
              collegeId,
              usn,
              departmentId,
              semester: student.semester,
            },
          });

          await tx.account.create({
            data: {
              userId: newUser.id,
              accountId: newUser.id,
              providerId: "credential",
              password: hashedPasswords.get(student.password)!,
            },
          });
        });

        created++;
        existingEmails.add(email);
        existingUsns.add(usn);
      } catch (err) {
        errors.push(`Failed to create student "${email}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({ created, skipped, errors });
  } catch (error) {
    console.error("POST /api/students/bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
