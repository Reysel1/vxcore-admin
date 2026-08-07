import { PackageOpen } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { UploadInstallerForm } from "@/components/admin/installer-upload";
import { listInstallers } from "@/lib/db";
import {
  GithubError,
  getReleasesRepo,
  listReleaseAssets,
  type ReleaseAsset,
} from "@/lib/github";

function formatDate(sqlDate?: string | null): string {
  if (!sqlDate) return "—";
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function InstallersPage() {
  const installers = listInstallers();

  // Los assets se leen aquí, en el servidor: el layout ya exige sesión de
  // admin, así que el token de GitHub nunca sale del backend.
  let assets: ReleaseAsset[] = [];
  let assetsError: string | null = null;
  try {
    assets = await listReleaseAssets();
  } catch (err) {
    assetsError =
      err instanceof GithubError
        ? err.message
        : "No se pudieron leer las releases de GitHub.";
  }

  const published = new Set(
    installers.map((installer) => Number(installer.asset_id))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Instaladores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publica las versiones del instalador de VXCore a partir de las
          releases de GitHub. La marcada como «última» es la que descargan los
          usuarios desde su panel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="size-4 text-muted-foreground" />
            Publicar nueva versión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadInstallerForm
            repo={getReleasesRepo()}
            assets={assets.map((asset) => ({
              ...asset,
              alreadyPublished: published.has(asset.id),
            }))}
            loadError={assetsError}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Versiones publicadas</CardTitle>
        </CardHeader>
        <CardContent>
          {installers.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="Sin versiones publicadas"
              description="Publica una release de GitHub desde el formulario de arriba para que los usuarios puedan descargarla."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versión</TableHead>
                  <TableHead>Fichero</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Última</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Subida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installers.map((installer) => (
                  <TableRow key={String(installer.id)}>
                    <TableCell className="font-semibold">
                      v{String(installer.version)}
                    </TableCell>
                    <TableCell className="max-w-52 truncate font-mono text-xs text-muted-foreground">
                      {String(installer.filename)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(Number(installer.size_bytes) / 1024 / 1024).toFixed(1)}{" "}
                      MB
                    </TableCell>
                    <TableCell>
                      {Number(installer.is_latest) === 1 ? (
                        <span className="text-emerald-500">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {String(installer.note ?? "—")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(installer.created_at as string)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
