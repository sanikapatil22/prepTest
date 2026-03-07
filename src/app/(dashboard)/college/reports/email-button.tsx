"use client";

import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function EmailButton({ testId }: { testId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleEmail() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send report");
      }

      toast.success("Report sent to your email");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send report"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEmail}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Mail className="mr-2 size-4" />
      )}
      {loading ? "Sending..." : "Email"}
    </Button>
  );
}
