import { prisma } from "@/lib/prisma";
import type { Prisma, Role } from "@/generated/prisma/client";
import { RoleFilter } from "./role-filter";
import { UsersTable } from "./users-table";

const validRoles: Role[] = ["SUPER_ADMIN", "COLLEGE_ADMIN", "STUDENT"];

type PageProps = { searchParams: Promise<{ role?: string }> };

export default async function UsersListPage({ searchParams }: PageProps) {
  const { role } = await searchParams;

  const where: Prisma.UserWhereInput = {};
  if (role && validRoles.includes(role as Role)) {
    where.role = role as Role;
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      college: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          testAttempts: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    collegeName: user.college?.name ?? null,
    testAttemptCount: user._count.testAttempts,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            All registered users across the platform.
          </p>
        </div>
        <RoleFilter />
      </div>

      <UsersTable users={serializedUsers} />
    </div>
  );
}
