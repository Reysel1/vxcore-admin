"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError, sendJson } from "@/lib/fetch-json";

export function MarkPaidButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function markPaid() {
    setLoading(true);
    try {
      const data = await sendJson<{ license_key: string | null }>(
        "/api/orders",
        "POST",
        { id: orderId }
      );
      toast.success(
        data.license_key
          ? `Pedido pagado. Licencia ${data.license_key} creada.`
          : "Pedido marcado como pagado."
      );
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "No se pudo marcar como pagado."
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
