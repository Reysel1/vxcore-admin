"use client";

import {
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquareText,
  PackageOpen,
  ReceiptText,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/orders", label: "Pedidos", icon: ReceiptText },
  { href: "/licenses", label: "Licencias", icon: KeyRound },
  { href: "/installers", label: "Instaladores", icon: PackageOpen },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/contacts", label: "Contactos", icon: MessageSquareText },
];

export function Sidebar({ chatUnread = 0 }: { chatUnread?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    toast.success("Sesión cerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground font-heading text-sm font-bold text-background">
            VX
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">VXCore Admin</div>
            <div className="text-xs text-muted-foreground">Panel de control</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/chat" && chatUnread > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-foreground ring-1 ring-border">
                    {chatUnread}
                  </span>
                )}
              </a>
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
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground font-heading text-xs font-bold text-background">
            VX
          </span>
          <span className="text-sm font-semibold">VXCore Admin</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="size-4" />
          Salir
        </Button>
      </header>
      <nav className="sticky top-14 z-40 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur-xl md:hidden">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
              {item.href === "/chat" && chatUnread > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                  {chatUnread}
                </span>
              )}
            </a>
          );
        })}
      </nav>
    </>
  );
}
