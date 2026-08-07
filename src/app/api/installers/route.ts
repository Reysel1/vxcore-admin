import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { addInstaller, getDbError, listInstallers } from "@/lib/db";
import { GithubError, getReleaseAsset, getReleasesRepo } from "@/lib/github";

const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Publica una versión. Recibe solo el id del asset: el .exe ya está en GitHub,
 * así que el cuerpo son unos pocos bytes y no roza el límite de 4.5 MB que
 * Vercel impone a las peticiones.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dbError = getDbError();
  if (dbError) {
    return NextResponse.json(
      { error: `Base de datos no configurada: ${dbError}` },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    version?: unknown;
    note?: unknown;
    isLatest?: unknown;
    assetId?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const version = String(body.version ?? "").trim();
  const note = String(body.note ?? "").trim() || null;
  const isLatest = body.isLatest === true;
  const assetId = Number(body.assetId);

  if (!version || !VERSION_RE.test(version)) {
    return NextResponse.json(
      { error: "Versión inválida (solo letras, números, puntos y guiones)." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(assetId) || assetId <= 0) {
    return NextResponse.json(
      { error: "Selecciona el fichero de la release de GitHub." },
      { status: 400 }
    );
  }

  // Evita sobreescribir una versión ya publicada.
  if (listInstallers().some((installer) => installer.version === version)) {
    return NextResponse.json(
      { error: `La versión ${version} ya está publicada.` },
      { status: 400 }
    );
  }

  try {
    // Nombre y tamaño los tomamos de GitHub, no del cliente: así son los
    // reales y de paso confirmamos que el asset existe y es accesible.
    const asset = await getReleaseAsset(assetId);
    if (!asset) {
      return NextResponse.json(
        {
          error:
            "Ese fichero ya no está en las releases de GitHub. Recarga la lista.",
        },
        { status: 404 }
      );
    }

    addInstaller({
      version,
      filename: asset.name,
      sizeBytes: asset.sizeBytes,
      isLatest,
      note,
      assetId: asset.id,
      assetRepo: getReleasesRepo(),
    });

    return NextResponse.json({ ok: true, version, filename: asset.name });
  } catch (err) {
    if (err instanceof GithubError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
