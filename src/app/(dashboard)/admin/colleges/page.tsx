import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ArrowRight } from "lucide-react";
import { DeleteCollegeButton } from "./delete-college-button";

export default async function CollegesListPage() {
  const colleges = await prisma.college.findMany({
    include: {
      _count: {
        select: {
          users: true,
          placementDrives: true,
          departments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Colleges</h1>
          <p className="text-muted-foreground">
            Manage all registered colleges on the platform.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/colleges/new">
            <Plus />
            Add College
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead className="text-center">Students</TableHead>
              <TableHead className="text-center">Drives</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colleges.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No colleges found. Create your first college to get started.
                </TableCell>
              </TableRow>
            ) : (
              colleges.map((college) => (
                <TableRow key={college.id}>
                  <TableCell className="font-medium">{college.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {college.code}
                  </TableCell>
                  <TableCell>{college.contactEmail || "--"}</TableCell>
                  <TableCell className="text-center">
                    {college._count.users}
                  </TableCell>
                  <TableCell className="text-center">
                    {college._count.placementDrives}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={college.isActive ? "default" : "secondary"}
                    >
                      {college.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/colleges/${college.id}`}>
                          View
                          <ArrowRight />
                        </Link>
                      </Button>
                      <DeleteCollegeButton
                        collegeId={college.id}
                        collegeName={college.name}
                        userCount={college._count.users}
                        driveCount={college._count.placementDrives}
                        departmentCount={college._count.departments}
                      />
                    </div>
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
