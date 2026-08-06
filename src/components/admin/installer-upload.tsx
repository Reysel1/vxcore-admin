"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function UploadInstallerForm() {
  const router = useRouter();
  const [version, setVersion] = React.useState("");
  const [note, setNote] = React.useState("");
  const [isLatest, setIsLatest] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Selecciona el fichero del instalador.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("version", version.trim());
      form.append("note", note);
      form.append("isLatest", String(isLatest));
      form.append("file", file);

      const res = await fetch("/api/installers", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo subir el instalador.");
        return;
      }
      toast.success(`Versión v${data.version} publicada`);
      setVersion("");
      setNote("");
      setFile(null);
      router.refresh();
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="inst-file">Fichero del instalador</Label>
        <Input
          id="inst-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          required
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
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
        <Button type="submit" className="h-9 gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {loading ? "Subiendo…" : "Publicar versión"}
        </Button>
      </div>
    </form>
  );
}
