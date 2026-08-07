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

type Conv = {
  user_email: string;
  user_name: string | null;
  last_body: string;
  last_sender: "user" | "staff";
  last_at: string;
  unread: number;
  ticket_status: "open" | "closed" | null;
  ticket_rating: number | null;
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

/** Estrellas de solo lectura para mostrar la valoración del usuario. */
function StarRating({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
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

function formatTime(sqlDate?: string): string {
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

export function ChatAdmin() {
  const [conversations, setConversations] = React.useState<Conv[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [draft, setDraft] = React.useState("");
  const [loadingConv, setLoadingConv] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const knownIds = React.useRef<Set<number>>(new Set());
  const selectedRef = React.useRef<string | null>(null);

  const current = conversations.find((c) => c.user_email === selected) ?? null;

  /* ---------- lista de conversaciones ---------- */
  async function loadConversations() {
    try {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.conversations)) return;
      setConversations(data.conversations as Conv[]);
      setSelected((prev) => {
        if (prev) return prev;
        return (data.conversations[0]?.user_email as string) ?? null;
      });
    } catch {
      /* noop */
    } finally {
      setLoadingConv(false);
    }
  }

  /* ---------- mensajes de la conversación seleccionada ---------- */
  async function loadMessages(user: string) {
    try {
      const res = await fetch(`/api/chat?user=${encodeURIComponent(user)}`);
      if (!res.ok) return;
      // Si el usuario cambió de conversación mientras llegaba la respuesta,
      // descartamos los mensajes de la conversación anterior.
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
    const t = window.setTimeout(loadConversations, 0);
    const id = window.setInterval(loadConversations, 5000);
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
    const id = window.setInterval(() => loadMessages(selected), 4000);
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
      // El polling pudo añadir este mensaje antes que la respuesta del POST.
      if (!knownIds.current.has(created.id)) {
        knownIds.current.add(created.id);
        setMessages((prev) => [...prev, created]);
      }
      setDraft("");
      loadConversations();
    } catch {
      toast.error("Error de red.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Lista de conversaciones */}
      <Card className="lg:h-[calc(100vh-12rem)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="size-4 text-muted-foreground" />
            Conversaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConv ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Cargando…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1.5 text-center">
              <MessageCircle className="size-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay conversaciones.
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[calc(100vh-16rem)] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
              {conversations.map((conv) => (
                <button
                  key={conv.user_email}
                  onClick={() => setSelected(conv.user_email)}
                  className={cn(
                    "min-w-56 shrink-0 rounded-xl border p-3 text-left transition-colors lg:min-w-0",
                    selected === conv.user_email
                      ? "border-foreground/40 bg-muted"
                      : "border-border bg-background hover:border-foreground/25"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          conv.ticket_status === "open"
                            ? "bg-emerald-500"
                            : conv.ticket_status === "closed"
                              ? "bg-muted-foreground/40"
                              : "bg-muted-foreground/15"
                        )}
                        title={
                          conv.ticket_status === "open"
                            ? "Ticket abierto"
                            : conv.ticket_status === "closed"
                              ? "Ticket cerrado"
                              : "Sin ticket"
                        }
                      />
                      <span className="truncate text-sm font-medium">
                        {conv.user_name ?? conv.user_email}
                      </span>
                      {conv.ticket_status && Number(conv.ticket_rating) > 0 && (
                        <Star
                          className="size-3 shrink-0 fill-amber-400 text-amber-400"
                          aria-label={`Valorado con ${conv.ticket_rating} de 5`}
                        />
                      )}
                    </span>
                    {Number(conv.unread) > 0 && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                        {String(conv.unread)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conv.last_sender === "staff" ? "Tú: " : ""}
                    {conv.last_body}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {conv.user_email} · {formatTime(conv.last_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ventana de chat */}
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
              "Selecciona una conversación"
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
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Elige una conversación de la izquierda para responder.
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
                        {formatTime(m.created_at)}
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
