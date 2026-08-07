"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Inbox,
  Layers,
  Loader2,
  MessageCircle,
  MessageSquareDashed,
  Send,
  Star,
  Ticket,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/admin/empty-state";
import {
  AnimatedTabs,
  type AnimatedTab,
} from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, requestJson, sendJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

type Msg = {
  id: number;
  sender: "user" | "staff";
  body: string;
  created_at: string;
};

type TicketStatus = "open" | "closed" | "none";

type TicketItem = {
  id: number | null;
  user_email: string;
  user_name: string | null;
  subject: string | null;
  status: TicketStatus;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  closed_at: string | null;
  rated_at: string | null;
  last_body: string | null;
  unread: number;
};

type Ticket = {
  id: number;
  user_email: string;
  subject: string | null;
  status: "open" | "closed";
  rating: number | null;
  rating_comment: string | null;
  closed_at: string | null;
  rated_at: string | null;
  created_at: string;
};

const TICKET_POLL_MS = 5000;
const MSG_POLL_MS = 4000;

type Filter = TicketStatus | "all";

const TAB_DESCRIPTIONS: Record<Filter, string> = {
  open: "Conversaciones vivas: son las que esperan una respuesta tuya.",
  closed:
    "Tickets ya resueltos, con la valoración que dejó el usuario al cerrarlos.",
  none: "Conversaciones sueltas, sin ticket asociado (anteriores al sistema de tickets).",
  all: "Todo el historial de soporte. Los abiertos aparecen primero.",
};

/**
 * Clave estable de una fila de la lista.
 *
 * Antes la selección se guardaba por email, así que un usuario con dos tickets
 * hacía que ambas filas se marcaran a la vez y siempre se abriera la misma
 * conversación. La clave real es el id del ticket; las conversaciones sin
 * ticket (id NULL) solo pueden tener una fila por usuario, y ahí sí vale el
 * email.
 */
function ticketKey(t: Pick<TicketItem, "id" | "user_email">): string {
  return t.id != null ? `t${t.id}` : `u${t.user_email}`;
}

function formatDate(sqlDate?: string | null) {
  if (!sqlDate) return "";
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return sameDay
    ? time
    : `${d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · ${time}`;
}

/** Estrellas de solo lectura para mostrar la valoración del usuario. */
function StarRating({ value }: { value: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5"
      aria-label={`Valoración: ${value} de 5`}
    >
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3",
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  if (status === "open") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Abierto
      </span>
    );
  }
  if (status === "none") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
        Sin ticket
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      Cerrado
    </span>
  );
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
};

const bubbleVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 32 },
  },
};

/**
 * Conversación abierta. Se guarda como valor propio y no como referencia a la
 * fila de la lista: la lista se recrea entera en cada sondeo, y depender de la
 * identidad de ese objeto reiniciaría el hilo cada 5 segundos.
 */
type Selection = { key: string; email: string; ticketId: number | null };

export function TicketsAdmin() {
  const [tickets, setTickets] = React.useState<TicketItem[]>([]);
  const [filter, setFilter] = React.useState<Filter>("open");
  const [selection, setSelection] = React.useState<Selection | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [draft, setDraft] = React.useState("");
  const [loadingTickets, setLoadingTickets] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const knownIds = React.useRef<Set<number>>(new Set());
  const selectedKeyRef = React.useRef<string | null>(null);
  const previousKeyRef = React.useRef<string | null>(null);

  const selectedKey = selection?.key ?? null;
  // Fila viva de la lista: sirve para que la cabecera refleje cambios (nombre,
  // estado) sin tocar la selección.
  const current = tickets.find((t) => ticketKey(t) === selectedKey) ?? null;

  const counts = React.useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      closed: tickets.filter((t) => t.status === "closed").length,
      none: tickets.filter((t) => t.status === "none").length,
      all: tickets.length,
    }),
    [tickets]
  );

  const visible = React.useMemo(
    () =>
      filter === "all" ? tickets : tickets.filter((t) => t.status === filter),
    [tickets, filter]
  );

  const tabs: readonly AnimatedTab<Filter>[] = [
    { value: "open", label: "Abiertos", count: counts.open, icon: Inbox },
    {
      value: "closed",
      label: "Cerrados",
      count: counts.closed,
      icon: CheckCircle2,
    },
    {
      value: "none",
      label: "Sin ticket",
      count: counts.none,
      icon: MessageSquareDashed,
    },
    { value: "all", label: "Todos", count: counts.all, icon: Layers },
  ];

  /* ---------- lista de tickets ---------- */
  const loadTickets = React.useCallback(async () => {
    try {
      const data = await requestJson<{ tickets: TicketItem[] }>("/api/tickets");
      if (Array.isArray(data.tickets)) setTickets(data.tickets);
    } catch {
      // Silencioso: es un sondeo de fondo, un fallo puntual no debe llenar
      // la pantalla de avisos.
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  /* ---------- mensajes del ticket seleccionado ---------- */
  const loadMessages = React.useCallback(async (sel: Selection) => {
    const params = new URLSearchParams({ user: sel.email });
    // Sin este parámetro la API devolvía todos los mensajes del usuario, así
    // que dos tickets del mismo usuario mostraban el mismo hilo.
    if (sel.ticketId != null) params.set("ticket", String(sel.ticketId));

    try {
      const data = await requestJson<{ messages: Msg[]; ticket: Ticket }>(
        `/api/chat?${params}`
      );
      // Si cambió de ticket mientras llegaba la respuesta, descartamos.
      if (selectedKeyRef.current !== sel.key) return;
      if (!Array.isArray(data.messages)) return;

      setTicket(data.ticket ?? null);
      const fresh = data.messages.filter((m) => !knownIds.current.has(m.id));
      if (fresh.length > 0) {
        fresh.forEach((m) => knownIds.current.add(m.id));
        setMessages((prev) => [...prev, ...fresh]);
      }
    } catch {
      // Igual que arriba: sondeo de fondo.
    } finally {
      if (selectedKeyRef.current === sel.key) setLoadingMessages(false);
    }
  }, []);

  /**
   * Sondeo que se detiene con la pestaña en segundo plano.
   *
   * Antes los dos `setInterval` seguían pegándole a la API aunque el panel
   * llevara horas oculto en otra pestaña. Ahora se paran al ocultarse y, al
   * volver, refrescan inmediatamente para no mostrar datos rancios.
   */
  React.useEffect(() => {
    let intervalId = 0;

    const start = () => {
      if (intervalId) return;
      void loadTickets();
      intervalId = window.setInterval(loadTickets, TICKET_POLL_MS);
    };
    const stop = () => {
      window.clearInterval(intervalId);
      intervalId = 0;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadTickets]);

  /**
   * Abre una conversación.
   *
   * El vaciado del hilo va aquí y no en el efecto a propósito: la selección
   * solo cambia por acción del usuario, y resetear estado dentro de un efecto
   * provoca un render en cascada (además de saltarse la regla
   * `react-hooks/set-state-in-effect`). El efecto de abajo se queda solo con
   * lo que sí es una suscripción: el sondeo.
   */
  function openConversation(sel: Selection) {
    if (sel.key === selectedKeyRef.current) return;
    selectedKeyRef.current = sel.key;
    knownIds.current.clear();
    setSelection(sel);
    setMessages([]);
    setTicket(null);
    setLoadingMessages(true);
  }

  React.useEffect(() => {
    if (!selection) return;

    let intervalId = 0;
    const start = () => {
      if (intervalId) return;
      void loadMessages(selection);
      intervalId = window.setInterval(
        () => loadMessages(selection),
        MSG_POLL_MS
      );
    };
    const stop = () => {
      window.clearInterval(intervalId);
      intervalId = 0;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [selection, loadMessages]);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Al abrir otra conversación saltamos al final sin animar; solo los
    // mensajes nuevos de la conversación ya abierta se desplazan suave.
    const switched = previousKeyRef.current !== selectedKey;
    previousKeyRef.current = selectedKey;
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: switched ? "auto" : "smooth",
    });
  }, [messages.length, selectedKey]);

  async function handleSend() {
    if (!selection) return;
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      const data = await sendJson<{ message: Msg }>("/api/chat", "POST", {
        user: selection.email,
        message: body,
      });
      const created = data.message;
      if (created && !knownIds.current.has(created.id)) {
        knownIds.current.add(created.id);
        setMessages((prev) => [...prev, created]);
      }
      setDraft("");
      void loadTickets();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo enviar el mensaje."
      );
    } finally {
      setSending(false);
    }
  }

  const panelId = "tickets-panel";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <AnimatedTabs
          items={tabs}
          value={filter}
          onValueChange={setFilter}
          layoutId="tickets-tab-indicator"
          panelId={panelId}
        />
        {/* Una línea que explica qué es cada pestaña, en vez de dejar al
            usuario deducirlo del nombre. */}
        <div className="min-h-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={filter}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className="text-xs text-muted-foreground"
            >
              {TAB_DESCRIPTIONS[filter]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${filter}`}
        className="grid gap-5 lg:grid-cols-[340px_1fr]"
      >
        {/* Lista de tickets */}
        <Card className="lg:h-[calc(100vh-16rem)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4 text-muted-foreground" />
              {tabs.find((t) => t.value === filter)?.label}
            </CardTitle>
            {!loadingTickets && (
              <p className="text-xs text-muted-foreground">
                {visible.length}{" "}
                {visible.length === 1 ? "conversación" : "conversaciones"}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Cargando…
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title={
                  filter === "open"
                    ? "Nada pendiente"
                    : "No hay nada en esta pestaña"
                }
                description={
                  filter === "open"
                    ? "No tienes tickets abiertos esperando respuesta."
                    : "Prueba con otra pestaña para ver el resto del historial."
                }
                className="py-8"
              />
            ) : (
              <motion.div
                key={filter}
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[calc(100vh-22rem)] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
              >
                {visible.map((t) => {
                  const key = ticketKey(t);
                  const active = selectedKey === key;
                  return (
                    <motion.button
                      key={key}
                      variants={listItemVariants}
                      whileTap={{ scale: 0.985 }}
                      onClick={() =>
                        openConversation({
                          key,
                          email: t.user_email,
                          ticketId: t.id,
                        })
                      }
                      aria-pressed={active}
                      className={cn(
                        "relative min-w-60 shrink-0 rounded-xl border p-3 text-left transition-colors lg:min-w-0",
                        active
                          ? "border-foreground/40 bg-muted"
                          : "border-border bg-background hover:border-foreground/25"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="ticket-active-bar"
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-foreground"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                        />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {t.subject ??
                            (t.id ? `Ticket #${t.id}` : "Conversación")}
                        </span>
                        {Number(t.unread) > 0 && (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                            {String(t.unread)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {t.user_name ?? t.user_email}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        {Number(t.rating) > 0 && (
                          <StarRating value={Number(t.rating)} />
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                          {t.last_body ?? "Sin mensajes"}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatDate(t.created_at)}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Conversación del ticket seleccionado */}
        <Card className="flex flex-col">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-2 text-base">
              <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
              {selection ? (
                <span className="truncate">
                  {current?.user_name ?? "Usuario"} ·{" "}
                  <span className="font-normal text-muted-foreground">
                    {selection.email}
                  </span>
                </span>
              ) : (
                "Selecciona un ticket"
              )}
              {ticket && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    ticket.status === "open"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : ticket.rating != null
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                        : "border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  <Ticket className="size-3" />
                  {ticket.status === "open"
                    ? `Ticket #${ticket.id} abierto`
                    : ticket.rating != null
                      ? `Cerrado · ${ticket.rating}/5`
                      : `Ticket #${ticket.id} cerrado`}
                </span>
              )}
            </CardTitle>
            {ticket?.rating != null && ticket.rating_comment && (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <StarRating value={Number(ticket.rating)} />
                <span className="truncate">“{ticket.rating_comment}”</span>
              </p>
            )}
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3">
            {/* Se abre por `selection`, no por `current`: cambiar de pestaña
                saca el ticket de la lista visible pero no debe cerrar el hilo
                que estabas leyendo. */}
            {!selection ? (
              <EmptyState
                icon={Ticket}
                title="Ninguna conversación abierta"
                description="Elige un ticket de la lista para leer el hilo y responder al usuario."
                className="h-72 border-0"
              />
            ) : (
              <>
                <div
                  ref={scrollerRef}
                  className="flex h-[calc(100vh-24rem)] min-h-64 flex-col gap-2.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3"
                >
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Cargando mensajes…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      Esta conversación todavía no tiene mensajes.
                    </div>
                  ) : (
                    <motion.div
                      key={selectedKey}
                      variants={listVariants}
                      initial="hidden"
                      animate="show"
                      className="flex flex-col gap-2.5"
                    >
                      {messages.map((m) => (
                        <motion.div
                          key={m.id}
                          variants={bubbleVariants}
                          className={cn(
                            "flex flex-col gap-1",
                            m.sender === "staff" ? "items-end" : "items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                              m.sender === "staff"
                                ? "rounded-br-md bg-foreground text-background"
                                : "rounded-bl-md border border-border bg-background"
                            )}
                          >
                            {m.body}
                          </div>
                          <span className="px-1 text-[10px] text-muted-foreground">
                            {m.sender === "staff" ? "Tú (staff)" : "Usuario"} ·{" "}
                            {formatDate(m.created_at)}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSend();
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Responde al usuario… (Enter para enviar)"
                    rows={2}
                    maxLength={2000}
                    className="min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  />
                  <Button
                    type="submit"
                    className="h-11 gap-2 px-4"
                    disabled={sending || !draft.trim()}
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span className="hidden sm:inline">Enviar</span>
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
