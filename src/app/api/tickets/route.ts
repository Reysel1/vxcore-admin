import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getDbError, listTicketsAdmin } from "@/lib/db";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const error = getDbError();
  if (error) {
    return NextResponse.json(
      { error: `Base de datos no configurada: ${error}` },
      { status: 503 }
    );
  }

  const tickets = listTicketsAdmin();
  return NextResponse.json({ tickets });
}
