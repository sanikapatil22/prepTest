import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";

// GET /api/colleges/usn-structure — get USN structure for the authenticated college admin's college
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; collegeId: string };
    if (user.role !== "COLLEGE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const college = await prisma.college.findUnique({
      where: { id: user.collegeId },
      select: {
        usnFormat: true,
        usnDeptStart: true,
        usnDeptLength: true,
      },
    });

    if (!college) {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }

    if (!college.usnFormat || college.usnDeptStart == null || college.usnDeptLength == null) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({
      configured: true,
      usnFormat: college.usnFormat,
      usnDeptStart: college.usnDeptStart,
      usnDeptLength: college.usnDeptLength,
    });
  } catch (error) {
    console.error("GET /api/colleges/usn-structure error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
