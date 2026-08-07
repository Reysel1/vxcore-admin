"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError, sendJson } from "@/lib/fetch-json";

export function GrantLicenseButton({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function grant() {
    setLoading(true);
    try {
      const data = await sendJson<{ license_key: string }>(
        "/api/licenses",
        "POST",
        { email, note: "Licencia manual desde admin" }
      );
      toast.success(`Licencia ${data.license_key} creada`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo crear la licencia."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={grant}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <KeyRound className="size-3.5" />
      )}
      Licencia
    </Button>
  );
}
