import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GrantLicenseButton } from "@/components/admin/user-actions";
import { listUsers } from "@/lib/db";

function formatDate(sqlDate?: string | null): string {
  if (!sqlDate) return "—";
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UsersPage() {
  const users = listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Usuarios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} usuarios registrados en la web.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" />
            Todos los usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay usuarios. Aparecerán aquí al iniciar sesión con
              Google o Discord desde la web.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Pedidos pagados</TableHead>
                  <TableHead>Licencias activas</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={String(user.email)}>
                    <TableCell className="font-medium">
                      {String(user.email)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(user.name ?? "—")}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {String(user.provider ?? "—")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          Number(user.orders_paid) > 0
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }
                      >
                        {String(user.orders_paid)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(user.licenses_active)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at as string)}
                    </TableCell>
                    <TableCell className="text-right">
                      <GrantLicenseButton email={String(user.email)} />
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
