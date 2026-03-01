import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import type { Prisma, Role } from "@/generated/prisma/client";
import { RoleFilter } from "./role-filter";

const validRoles: Role[] = ["SUPER_ADMIN", "COLLEGE_ADMIN", "STUDENT"];

const roleBadgeVariant: Record<
  Role,
  "destructive" | "default" | "secondary"
> = {
  SUPER_ADMIN: "destructive",
  COLLEGE_ADMIN: "default",
  STUDENT: "secondary",
};

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  COLLEGE_ADMIN: "College Admin",
  STUDENT: "Student",
};

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
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            All registered users across the platform.
          </p>
        </div>
        <RoleFilter />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[user.role]}>
                      {roleLabel[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.college ? user.college.name : "--"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
