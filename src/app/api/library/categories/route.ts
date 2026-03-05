import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";

// GET /api/library/categories — get distinct categories for autocomplete
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
    const scope = searchParams.get("scope"); // "public", "private", "all"

    const where: Record<string, unknown> = {};

    if (user.role === "SUPER_ADMIN") {
      // SUPER_ADMIN: always get categories from public questions only
      where.collegeId = null;
    } else if (user.role === "COLLEGE_ADMIN") {
      if (scope === "private") {
        where.collegeId = user.collegeId;
      } else if (scope === "all") {
        where.OR = [{ collegeId: null }, { collegeId: user.collegeId }];
      } else {
        // Default (scope=public or no scope): public questions only
        where.collegeId = null;
      }
    }

    const results = await prisma.libraryQuestion.findMany({
      where,
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    const categories = results.map((r) => r.category);

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/library/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
