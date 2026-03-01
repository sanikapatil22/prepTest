import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
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
import { format } from "date-fns";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  UPCOMING: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function DrivesListPage() {
  const session = await getSession();
  const user = session!.user as { id: string; collegeId: string };

  const drives = await prisma.placementDrive.findMany({
    where: { collegeId: user.collegeId },
    include: {
      _count: { select: { tests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            Placement Drives
          </h1>
          <p className="text-muted-foreground">
            Manage your college placement drives and associated tests.
          </p>
        </div>
        <Button asChild>
          <Link href="/college/drives/new">
            <Plus />
            Create Drive
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Tests</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drives.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No drives found. Create your first placement drive to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              drives.map((drive) => (
                <TableRow key={drive.id}>
                  <TableCell className="font-medium">{drive.title}</TableCell>
                  <TableCell>{drive.companyName || "--"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[drive.status] ?? "secondary"}>
                      {drive.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {drive._count.tests}
                  </TableCell>
                  <TableCell>
                    {drive.startDate
                      ? format(new Date(drive.startDate), "MMM d, yyyy")
                      : "--"}
                  </TableCell>
                  <TableCell>
                    {drive.endDate
                      ? format(new Date(drive.endDate), "MMM d, yyyy")
                      : "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/college/drives/${drive.id}`}>
                        View
                        <ArrowRight />
                      </Link>
                    </Button>
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
