import { NextRequest, NextResponse } from "next/server";

import { createLicense, setLicenseStatus } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { email?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  }

  const license = createLicense({
    userEmail: email,
    note: body.note?.trim() || null,
  });

  return NextResponse.json({ license_key: license.license_key });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { id?: number; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = Number(body.id);
  const status = body.status;
  if (!id || (status !== "active" && status !== "revoked")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  setLicenseStatus(id, status);
  return NextResponse.json({ ok: true });
}
