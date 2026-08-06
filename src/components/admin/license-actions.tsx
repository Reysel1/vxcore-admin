"use client";

import { KeyRound, Loader2, RotateCcw, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateLicenseForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear la licencia.");
        return;
      }
      toast.success(`Licencia ${data.license_key} creada`);
      setEmail("");
      setNote("");
      router.refresh();
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="license-email">Email del usuario</Label>
        <Input
          id="license-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@email.com"
          required
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="license-note">Nota (opcional)</Label>
        <Input
          id="license-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="p. ej. beta cerrada"
          maxLength={200}
        />
      </div>
      <Button type="submit" className="h-9 gap-2" disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Generar licencia
      </Button>
    </form>
  );
}

export function ToggleLicenseButton({
  id,
  status,
}: {
  id: number;
  status: "active" | "revoked";
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const isActive = status === "active";

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: isActive ? "revoked" : "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar.");
        return;
      }
      toast.success(isActive ? "Licencia revocada" : "Licencia activada");
      router.refresh();
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={isActive ? "ghost" : "outline"}
      size="sm"
      className="gap-1.5 text-muted-foreground"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isActive ? (
        <ShieldX className="size-3.5" />
      ) : (
        <RotateCcw className="size-3.5" />
      )}
      {isActive ? "Revocar" : "Activar"}
    </Button>
  );
}
