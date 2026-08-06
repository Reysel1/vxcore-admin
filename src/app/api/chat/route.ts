import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { addMessage, listMessages, markMessagesRead } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  const created = addMessage({
    userEmail: user,
    sender: "staff",
    body: message,
  });

  return NextResponse.json({ message: created });
}
