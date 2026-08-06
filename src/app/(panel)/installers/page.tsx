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
import { UploadInstallerForm } from "@/components/admin/installer-upload";
import { listInstallers } from "@/lib/db";

function formatDate(sqlDate?: string | null): string {
  if (!sqlDate) return "—";
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InstallersPage() {
  const installers = listInstallers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Instaladores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube las versiones del instalador de VXCore. La marcada como «última»
          es la que descargan los usuarios desde su panel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="size-4 text-muted-foreground" />
            Subir nueva versión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadInstallerForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Versiones publicadas</CardTitle>
        </CardHeader>
        <CardContent>
          {installers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin versiones publicadas todavía.
            </p>
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
