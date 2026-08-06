"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function MarkPaidButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function markPaid() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo marcar como pagado.");
        return;
      }
      toast.success(
        data.license_key
          ? `Pedido pagado. Licencia ${data.license_key} creada.`
          : "Pedido marcado como pagado."
      );
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
      onClick={markPaid}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="size-3.5" />
      )}
      Marcar pagado
    </Button>
  );
}
