import { KeyRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreateLicenseForm,
  ToggleLicenseButton,
} from "@/components/admin/license-actions";
import { listLicenses } from "@/lib/db";

function formatDate(sqlDate?: string | null): string {
  if (!sqlDate) return "—";
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LicensesPage() {
  const licenses = listLicenses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Licencias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las licencias se generan solas al pagar por Stripe. Aquí también
          puedes crearlas a mano (por ejemplo, para premios o beta) y revocarlas.
        </p>
      </div>

      {/* Crear licencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-muted-foreground" />
            Nueva licencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateLicenseForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas las licencias</CardTitle>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin licencias todavía.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Licencia</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => (
                  <TableRow key={String(license.id)}>
                    <TableCell className="font-mono text-xs tracking-wider">
                      {String(license.license_key)}
                    </TableCell>
                    <TableCell className="max-w-44 truncate">
                      {String(license.user_email)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          license.status === "active"
                            ? "text-emerald-500"
                            : "text-destructive"
                        }
                      >
                        {license.status === "active" ? "Activa" : "Revocada"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {String(license.note ?? "—")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(license.created_at as string)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ToggleLicenseButton
                        id={Number(license.id)}
                        status={license.status as "active" | "revoked"}
                      />
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
