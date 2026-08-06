import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import {
  createLicense,
  listLicenses,
  listOrders,
  markOrderPaid,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = Number(body.id);
  const order = listOrders().find((o) => Number(o.id) === id);
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }
  if (order.status === "paid") {
    return NextResponse.json({ ok: true });
  }

  const email = String(order.user_email);
  markOrderPaid(id, {
    amountCents: Number(order.amount_cents ?? 0) || null,
    currency: String(order.currency ?? "eur"),
  });

  // Solo crea licencia si el usuario aún no tiene una activa.
  let licenseKey: string | null = null;
  const alreadyActive = listLicenses().some(
    (l) => l.user_email === email && l.status === "active"
  );
  if (!alreadyActive) {
    const license = createLicense({
      userEmail: email,
      note: "Marcado pagado manualmente",
    });
    licenseKey = String(license.license_key);
  }

  return NextResponse.json({ ok: true, license_key: licenseKey });
}
