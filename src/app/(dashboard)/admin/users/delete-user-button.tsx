"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  testAttemptCount: number;
}

export function DeleteUserButton({
  userId,
  userName,
  userEmail,
  userRole,
  testAttemptCount,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  if (userRole === "SUPER_ADMIN") {
    return null;
  }

  const roleLabel =
    userRole === "COLLEGE_ADMIN" ? "College Admin" : "Student";

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`User "${userName}" deleted successfully`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmDeleteAll(false);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${userName}`}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to delete <strong>{userName}</strong> ({userEmail},{" "}
                {roleLabel}). This user has the following related data:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  {testAttemptCount} test attempt
                  {testAttemptCount !== 1 ? "s" : ""} (and their answers)
                </li>
                <li>Sessions and account credentials</li>
              </ul>
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <Checkbox
                  id={`confirm-delete-user-${userId}`}
                  checked={confirmDeleteAll}
                  onCheckedChange={(v) => setConfirmDeleteAll(v === true)}
                />
                <label
                  htmlFor={`confirm-delete-user-${userId}`}
                  className="text-sm font-medium leading-tight cursor-pointer"
                >
                  Yes, delete this user and all their related data including{" "}
                  {testAttemptCount} test attempt
                  {testAttemptCount !== 1 ? "s" : ""}. This action cannot be
                  undone.
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || !confirmDeleteAll}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="mr-1 size-4" aria-hidden="true" />
            )}
            Delete Everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
