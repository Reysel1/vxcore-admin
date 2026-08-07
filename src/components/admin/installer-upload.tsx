"use client";

import { Loader2, RefreshCw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReleaseAsset } from "@/lib/github";

type Asset = ReleaseAsset & { alreadyPublished: boolean };

/**
 * Saca el mensaje de error real de la respuesta.
 *
 * No siempre es JSON: si la petición no llega a la función (por ejemplo un 413
 * de la plataforma) el cuerpo es texto plano, y hacer `res.json()` a secas
 * lanzaba una excepción que acababa mostrando un inútil «Error de red».
 */
async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // Cuerpo no-JSON: caemos al mensaje genérico de abajo.
  }
  return `Error ${res.status}: ${text.slice(0, 140) || res.statusText}`;
}

/** «v0.2.4» → «0.2.4»; el resto se deja tal cual. */
function versionFromTag(tag: string): string {
  return tag.replace(/^v/i, "");
}

export function UploadInstallerForm({
  repo,
  assets,
  loadError,
}: {
  repo: string;
  assets: Asset[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [version, setVersion] = React.useState("");
  const [note, setNote] = React.useState("");
  const [isLatest, setIsLatest] = React.useState(true);
  const [assetId, setAssetId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [refreshing, startRefresh] = React.useTransition();

  const selected = assets.find((a) => String(a.id) === assetId);

  function handleSelect(id: string) {
    setAssetId(id);
    // Sugiere la versión a partir de la etiqueta de la release, pero se puede
    // corregir a mano antes de publicar.
    const asset = assets.find((a) => String(a.id) === id);
    if (asset && !version.trim()) {
      setVersion(versionFromTag(asset.releaseTag));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId) {
      toast.error("Elige el fichero de la release de GitHub.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/installers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: version.trim(),
          note,
          isLatest,
          assetId: Number(assetId),
        }),
      });

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      const data = (await res.json()) as { version: string };
      toast.success(`Versión v${data.version} publicada`);
      setVersion("");
      setNote("");
      setAssetId("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `No se pudo publicar: ${err.message}`
          : "No se pudo publicar la versión."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="inst-asset">Fichero de la release</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            {loadError}
          </p>
        ) : (
          <select
            id="inst-asset"
            value={assetId}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={assets.length === 0}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {assets.length === 0
                ? "No hay ficheros en las releases de GitHub"
                : "Elige un fichero…"}
            </option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.releaseTag} · {asset.name} ·{" "}
                {(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB
                {asset.isDraft ? " · borrador" : ""}
                {asset.alreadyPublished ? " · ya publicado" : ""}
              </option>
            ))}
          </select>
        )}

        {selected?.alreadyPublished && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Este fichero ya está asociado a una versión publicada.
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="inst-version">Versión</Label>
          <Input
            id="inst-version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.4.2"
            pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            title="Solo letras, números, puntos y guiones"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="inst-note">Nota (opcional)</Label>
          <Input
            id="inst-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="p. ej. correcciones de logs"
            maxLength={200}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Switch
            id="inst-latest"
            checked={isLatest}
            onCheckedChange={setIsLatest}
          />
          <Label htmlFor="inst-latest" className="cursor-pointer">
            Marcar como última versión
          </Label>
        </div>
        <Button type="submit" className="h-9 gap-2" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {saving ? "Publicando…" : "Publicar versión"}
        </Button>
      </div>
    </form>
  );
}
