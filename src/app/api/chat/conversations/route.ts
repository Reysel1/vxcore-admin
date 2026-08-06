import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { listConversations } from "@/lib/db";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({ conversations: listConversations() });
}
