"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareText,
  MonitorSmartphone,
  PackageOpen,
  ReceiptText,
  Ticket,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/orders", label: "Pedidos", icon: ReceiptText },
  { href: "/licenses", label: "Licencias", icon: KeyRound },
  { href: "/installations", label: "Equipos", icon: MonitorSmartphone },
  { href: "/installers", label: "Instaladores", icon: PackageOpen },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/contacts", label: "Contactos", icon: MessageSquareText },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Spinner que solo aparece si la navegación tarda de verdad.
 *
 * `useLinkStatus` se pone en `pending` nada más pulsar el enlace, pero con la
 * ruta ya prefetcheada la transición termina en un par de frames y un spinner
 * que parpadea se ve peor que no tener nada. El retardo de entrada hace de
 * «debounce» sin necesidad de estado ni temporizadores: si la navegación acaba
 * antes, el elemento se desmonta sin haber llegado a ser visible.
 */
function LinkSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <AnimatePresence>
      {pending ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
          transition={{ duration: 0.15, delay: 0.15 }}
          className={className}
        >
          <Loader2 className="size-3.5 animate-spin" />
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

export function Sidebar({ chatUnread = 0 }: { chatUnread?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      toast.success("Sesión cerrada");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("No se pudo cerrar la sesión.");
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <Image
            src="/brand/vxcore-icon.png"
            alt=""
            width={32}
            height={32}
            aria-hidden
            className="size-8 shrink-0"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">VXCore Admin</div>
            <div className="text-xs text-muted-foreground">Panel de control</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {/* Píldora activa: `layoutId` la hace deslizarse de una
                    sección a otra en vez de saltar. */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-foreground"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                {/* `relative` en los hijos: al ser posicionados y venir
                    después de la píldora en el DOM, se pintan encima sin
                    necesitar z-index (un -z-10 en la píldora la escondería
                    detrás del fondo del aside). */}
                <item.icon className="relative size-4 shrink-0" />
                <span className="relative flex-1">{item.label}</span>
                <LinkSpinner className="relative flex items-center" />
                {item.href === "/tickets" && chatUnread > 0 && (
                  <span
                    className={cn(
                      "relative flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                      active
                        ? "bg-background text-foreground"
                        : "bg-foreground text-background"
                    )}
                  >
                    {chatUnread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-border p-3">
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" />
            Ver la web
          </a>
          <Button
            variant="ghost"
            className="justify-start gap-2.5 px-3 text-muted-foreground"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/vxcore-icon.png"
            alt=""
            width={28}
            height={28}
            aria-hidden
            className="size-7 shrink-0"
          />
          <span className="text-sm font-semibold">VXCore Admin</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={logout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Salir
        </Button>
      </header>
      <nav className="sticky top-14 z-40 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur-xl md:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                active ? "text-background" : "text-muted-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-mobile"
                  aria-hidden
                  className="absolute inset-0 rounded-md bg-foreground"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <item.icon className="relative size-3.5" />
              <span className="relative">{item.label}</span>
              {item.href === "/tickets" && chatUnread > 0 && (
                <span
                  className={cn(
                    "relative flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                    active
                      ? "bg-background text-foreground"
                      : "bg-foreground text-background"
                  )}
                >
                  {chatUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
