"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function GrantLicenseButton({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function grant() {
    setLoading(true);
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note: "Licencia manual desde admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear la licencia.");
        return;
      }
      toast.success(`Licencia ${data.license_key} creada`);
      router.refresh();
    } catch {
      toast.error("Error de red.");
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
