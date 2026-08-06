import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAdmin()) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      {/* Rejilla de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-[520px] -translate-x-1/2 rounded-full bg-foreground/[0.06] blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-foreground font-heading text-lg font-bold text-background">
            VX
          </div>
          <h1 className="mt-4 font-heading text-xl font-semibold tracking-tight">
            VXCore Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceso restringido al equipo.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
