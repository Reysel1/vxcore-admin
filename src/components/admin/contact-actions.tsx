"use client";

import { Check, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, sendJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

type Pending = "grant" | "read" | "delete" | null;

export function ContactActions({
  id,
  email,
  status,
  subject,
}: {
  id: number;
  email: string;
  status: "new" | "read";
  subject: string;
}) {
  const router = useRouter();
  // Antes había un único `loading` para las dos acciones: el spinner salía en
  // «Leído» aunque lo que estuvieras haciendo fuera borrar.
  const [pending, setPending] = React.useState<Pending>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [grantOpen, setGrantOpen] = React.useState(false);

  async function markRead() {
    setPending("read");
    try {
      await sendJson("/api/contacts", "PATCH", { id, status: "read" });
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo actualizar."
      );
    } finally {
      setPending(null);
    }
  }

  // Concede acceso al panel: crea una licencia activa para el email del
  // solicitante (es lo que desbloquea la descarga del instalador) y marca el
  // mensaje como leído.
  async function grantAccess() {
    setPending("grant");
    try {
      const data = await sendJson<{ license_key: string }>(
        "/api/licenses",
        "POST",
        {
          email,
          note: "Acceso concedido desde solicitud (beta)",
        }
      );
      toast.success(`Acceso concedido · licencia ${data.license_key}`);
      // Si seguía como nuevo, lo pasamos a leído para que no vuelva a contar
      // como pendiente en el panel.
      if (status === "new") {
        await sendJson("/api/contacts", "PATCH", { id, status: "read" }).catch(
          () => {}
        );
      }
      setGrantOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo conceder el acceso."
      );
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("delete");
    try {
      await sendJson("/api/contacts", "DELETE", { id });
      toast.success("Mensaje eliminado");
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo eliminar."
      );
    } finally {
      setPending(null);
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
          disabled={pending !== null}
        >
          {pending === "read" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Leído
        </Button>
      )}

      {/* Conceder acceso: crea la licencia del solicitante directamente desde
          la bandeja, sin ir a la sección Licencias. */}
      <AlertDialog open={grantOpen} onOpenChange={setGrantOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-emerald-600 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400"
            disabled={pending !== null}
          >
            {pending === "grant" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <KeyRound className="size-3.5" />
            )}
            Conceder acceso
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Conceder acceso al panel?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una licencia activa para <strong>{email}</strong> ({""}
              «{subject}»). Esa persona podrá descargar el instalador y usar
              VXCore. ¿Continuamos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending === "grant"}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600/90"
              disabled={pending === "grant"}
              onClick={(e) => {
                e.preventDefault();
                void grantAccess();
              }}
            >
              {pending === "grant" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Conceder acceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Borrar es irreversible y no había ninguna confirmación: un clic de
          más y el mensaje desaparecía sin forma de recuperarlo. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            disabled={pending !== null}
          >
            {pending === "delete" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar «{subject}». Esta acción no se puede deshacer y el
              mensaje no aparecerá en ningún otro sitio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending === "delete"}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "gap-1.5 bg-destructive text-white hover:bg-destructive/90"
              )}
              disabled={pending === "delete"}
              onClick={(e) => {
                // Sin esto Radix cierra el diálogo al instante y el usuario no
                // ve si el borrado funcionó o falló.
                e.preventDefault();
                void remove();
              }}
            >
              {pending === "delete" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
