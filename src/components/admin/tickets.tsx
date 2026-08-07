"use client";

import {
  Inbox,
  Loader2,
  MessageCircle,
  Send,
  Star,
  Ticket,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Msg = {
  id: number;
  sender: "user" | "staff";
  body: string;
  created_at: string;
};

type TicketItem = {
  id: number | null;
  user_email: string;
  user_name: string | null;
  subject: string | null;
  status: "open" | "closed" | "none";
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

function StatusBadge({ status }: { status: TicketItem["status"] }) {
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

export function TicketsAdmin() {
  const [tickets, setTickets] = React.useState<TicketItem[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [draft, setDraft] = React.useState("");
  const [loadingTickets, setLoadingTickets] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const knownIds = React.useRef<Set<number>>(new Set());
  const selectedRef = React.useRef<string | null>(null);

  const current = tickets.find((t) => t.user_email === selected) ?? null;
  const openCount = tickets.filter((t) => t.status === "open").length;

  /* ---------- lista de tickets ---------- */
  async function loadTickets() {
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.tickets)) return;
      setTickets(data.tickets as TicketItem[]);
    } catch {
      /* noop */
    } finally {
      setLoadingTickets(false);
    }
  }

  /* ---------- mensajes del ticket seleccionado ---------- */
  async function loadMessages(user: string) {
    try {
      const res = await fetch(`/api/chat?user=${encodeURIComponent(user)}`);
      if (!res.ok) return;
      // Si cambió de ticket mientras llegaba la respuesta, descartamos.
      if (selectedRef.current !== user) return;
      const data = await res.json();
      if (!Array.isArray(data.messages)) return;
      if (data.ticket) setTicket(data.ticket as Ticket);
      const fresh = (data.messages as Msg[]).filter(
        (m) => !knownIds.current.has(m.id)
      );
      if (fresh.length > 0) {
        fresh.forEach((m) => knownIds.current.add(m.id));
        setMessages((prev) => [...prev, ...fresh]);
      }
    } catch {
      /* noop */
    }
  }

  React.useEffect(() => {
    const t = window.setTimeout(loadTickets, 0);
    const id = window.setInterval(loadTickets, TICKET_POLL_MS);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    selectedRef.current = selected;
    knownIds.current.clear();
    const t1 = window.setTimeout(() => {
      setMessages([]);
      setTicket(null);
    }, 0);
    const t2 = window.setTimeout(() => loadMessages(selected), 0);
    const id = window.setInterval(() => loadMessages(selected), MSG_POLL_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(id);
    };
  }, [selected]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selected]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: selected, message: body }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo enviar.");
        return;
      }
      const created = data.message as Msg;
      if (!knownIds.current.has(created.id)) {
        knownIds.current.add(created.id);
        setMessages((prev) => [...prev, created]);
      }
      setDraft("");
      loadTickets();
    } catch {
      toast.error("Error de red.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      {/* Lista de tickets */}
      <Card className="lg:h-[calc(100vh-12rem)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="size-4 text-muted-foreground" />
            Tickets
          </CardTitle>
          {!loadingTickets && (
            <p className="text-xs text-muted-foreground">
              {openCount} abiertos · {tickets.length - openCount} cerrados
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Cargando…
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1.5 text-center">
              <Ticket className="size-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay tickets.
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[calc(100vh-18rem)] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
              {/* Un usuario puede tener varios tickets: la clave debe ser
                  única (id del ticket; las conversaciones sin ticket solo
                  tienen una fila, con id NULL). */}
              {tickets.map((t) => (
                <button
                  key={t.id ?? t.user_email}
                  onClick={() => setSelected(t.user_email)}
                  className={cn(
                    "min-w-60 shrink-0 rounded-xl border p-3 text-left transition-colors lg:min-w-0",
                    selected === t.user_email
                      ? "border-foreground/40 bg-muted"
                      : "border-border bg-background hover:border-foreground/25"
                  )}
                >
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
                    {Number(t.rating) > 0 && <StarRating value={Number(t.rating)} />}
                    <span className="truncate text-xs text-muted-foreground">
                      {t.last_body ?? "Sin mensajes"}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {formatDate(t.created_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversación del ticket seleccionado */}
      <Card className="flex flex-col">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-2 text-base">
            <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
            {current ? (
              <span className="truncate">
                {current.user_name ?? "Usuario"} ·{" "}
                <span className="font-normal text-muted-foreground">
                  {current.user_email}
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
          {!selected ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Ticket className="size-10 text-muted-foreground/40" />
              Selecciona un ticket de la lista para ver la conversación.
            </div>
          ) : (
            <>
              <div className="flex h-[calc(100vh-24rem)] min-h-64 flex-col gap-2.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Cargando mensajes…
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex flex-col gap-1",
                        m.sender === "staff" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
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
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
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
                  disabled={sending || !draft.trim() || !selected}
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
  );
}
