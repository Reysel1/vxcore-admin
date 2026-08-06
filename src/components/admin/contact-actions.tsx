"use client";

import { Check, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ContactActions({
  id,
  status,
}: {
  id: number;
  status: "new" | "read";
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function markRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "read" }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("No se pudo eliminar.");
        return;
      }
      toast.success("Mensaje eliminado");
      router.refresh();
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-end gap-1.5">
      {status === "new" && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={markRead}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Leído
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={remove}
        disabled={loading}
      >
        <Trash2 className="size-3.5" />
        Eliminar
      </Button>
    </div>
  );
}
