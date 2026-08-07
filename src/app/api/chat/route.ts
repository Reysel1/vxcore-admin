import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import {
  addMessage,
  getDbError,
  getUserTicket,
  listMessages,
  markMessagesRead,
} from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dbUnavailable(): NextResponse | null {
  const error = getDbError();
  return error
    ? NextResponse.json(
        { error: `Base de datos no configurada: ${error}` },
        { status: 503 }
      )
    : null;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = req.nextUrl.searchParams.get("user")?.trim().toLowerCase();
  if (!user || !EMAIL_RE.test(user)) {
    return NextResponse.json({ error: "Usuario no válido." }, { status: 400 });
  }

  const messages = listMessages(user);
  // El staff ha visto los mensajes del usuario.
  markMessagesRead(user, "user");

  // ?ticket=<id> limita la conversación a ese ticket (incluye los mensajes
  // legacy sin ticket para no perder historial).
  const ticketId = Number(req.nextUrl.searchParams.get("ticket") ?? 0);
  let filtered = messages;
  if (ticketId > 0) {
    filtered = messages.filter(
      (m) => Number(m.ticket_id) === ticketId || m.ticket_id == null
    );
  }

  // Ticket del usuario para que el staff vea el estado y la valoración.
  const ticket = getUserTicket(user) ?? null;

  return NextResponse.json({ messages: filtered, ticket });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const down = dbUnavailable();
  if (down) return down;

  let body: { user?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const user = body.user?.trim().toLowerCase();
  const message = body.message?.trim();
  if (!user || !EMAIL_RE.test(user)) {
    return NextResponse.json({ error: "Usuario no válido." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Escribe un mensaje." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "El mensaje no puede superar los 2000 caracteres." },
      { status: 400 }
    );
  }

  // El mensaje queda ligado al último ticket del usuario (abierto o cerrado).
  const userTicket = getUserTicket(user) ?? null;
  const created = addMessage({
    userEmail: user,
    sender: "staff",
    body: message,
    ticketId: userTicket ? Number(userTicket.id) : null,
  });

  return NextResponse.json({ message: created });
}
