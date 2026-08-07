import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { deleteContact, getDbError, setContactStatus } from "@/lib/db";

function dbUnavailable(): NextResponse | null {
  const error = getDbError();
  return error
    ? NextResponse.json(
        { error: `Base de datos no configurada: ${error}` },
        { status: 503 }
      )
    : null;
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const down = dbUnavailable();
  if (down) return down;

  let body: { id?: number; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = Number(body.id);
  const status = body.status;
  if (!id || (status !== "new" && status !== "read")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  setContactStatus(id, status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const down = dbUnavailable();
  if (down) return down;

  let body: { id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  deleteContact(id);
  return NextResponse.json({ ok: true });
}
