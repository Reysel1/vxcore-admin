import { writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import {
  addInstaller,
  getDataDir,
  getDbError,
  isRemote,
  listInstallers,
} from "@/lib/db";

const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (isRemote()) {
    // En Vercel no hay disco persistente para los ficheros.
    return NextResponse.json(
      {
        error:
          "Los instaladores no se pueden subir desde Vercel (no hay almacenamiento de ficheros). Usa el admin local o configura un bucket (R2/S3) — avísanos si lo quieres.",
      },
      { status: 400 }
    );
  }

  const dbError = getDbError();
  if (dbError) {
    return NextResponse.json(
      { error: `Base de datos no configurada: ${dbError}` },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const version = String(form.get("version") ?? "").trim();
  const note = String(form.get("note") ?? "").trim() || null;
  const isLatest = form.get("isLatest") === "true";
  const file = form.get("file");

  if (!version || !VERSION_RE.test(version)) {
    return NextResponse.json(
      { error: "Versión inválida (solo letras, números, puntos y guiones)." },
      { status: 400 }
    );
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta el fichero." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El fichero es demasiado grande." }, { status: 400 });
  }

  // Evita sobreescribir una versión ya publicada.
  const existing = listInstallers().find((i) => i.version === version);
  if (existing) {
    return NextResponse.json(
      { error: `La versión ${version} ya está publicada.` },
      { status: 400 }
    );
  }

  const originalName = file.name || "instalador";
  const ext = path.extname(originalName) || ".exe";
  const filename = `vxcore-setup-${version}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const dir = path.join(getDataDir(), "installers");
  await writeFile(path.join(dir, filename), bytes);

  addInstaller({
    version,
    filename,
    sizeBytes: bytes.length,
    isLatest,
    note,
  });

  return NextResponse.json({ ok: true, version, filename });
}
