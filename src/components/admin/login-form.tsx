"use client";

import { Loader2, Lock, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, sendJson } from "@/lib/fetch-json";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendJson("/api/login", "POST", { password });
      toast.success("Bienvenido de vuelta.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Contraseña incorrecta."
      );
      // Solo soltamos el botón si falló: si fue bien, la navegación se lleva
      // el formulario por delante y reactivarlo produce un parpadeo.
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="admin-password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 pl-9"
            required
          />
        </div>
      </div>

      <Button type="submit" className="h-10 gap-2" disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        {loading ? "Entrando…" : "Entrar"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        La contraseña está en <code>.env.local</code> (ADMIN_PASSWORD).
      </p>
    </form>
  );
}
