import { MonitorSmartphone } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listInstallations } from "@/lib/db";

function formatDate(sqlDate?: string | null): string {
  if (!sqlDate) return "—";
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * «Visto hace…» en lugar de una fecha suelta: lo que importa de un equipo es
 * si sigue vivo, y eso se lee de un vistazo mucho mejor en relativo.
 */
function relativeSince(sqlDate?: string | null): string {
  if (!sqlDate) return "nunca";
  const then = new Date(sqlDate.replace(" ", "T") + "Z").getTime();
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 0) return "ahora";
  if (minutes < 15) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

/**
 * El agente revalida cada 10 minutos con la app abierta, así que pasados 30
 * damos el equipo por apagado en vez de por conectado.
 */
function isOnline(sqlDate?: string | null): boolean {
  if (!sqlDate) return false;
  const then = new Date(sqlDate.replace(" ", "T") + "Z").getTime();
  return Date.now() - then < 30 * 60 * 1000;
}

export default function InstallationsPage() {
  const installations = listInstallations();
  const online = installations.filter((i) => isOnline(i.last_seen as string));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Equipos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ordenadores con VXCore Escritorio instalado. Se registran solos cuando
          la app valida su licencia, así que un equipo que nunca ha activado no
          aparece aquí.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorSmartphone className="size-4 text-muted-foreground" />
            Todos los equipos
          </CardTitle>
          {installations.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {online.length} activos ahora · {installations.length} en total
            </p>
          )}
        </CardHeader>
        <CardContent>
          {installations.length === 0 ? (
            <EmptyState
              icon={MonitorSmartphone}
              title="Ningún equipo todavía"
              description="Aparecerán aquí en cuanto alguien active la app de escritorio con su clave de licencia."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Licencia</TableHead>
                  <TableHead>Dueño</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Panel público</TableHead>
                  <TableHead>Visto</TableHead>
                  <TableHead>Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installations.map((installation) => {
                  // El estado de la licencia se calcula en la consulta, no se
                  // guarda: revocarla se refleja aquí sin tocar esta tabla.
                  const active = installation.license_status === "active";
                  const seenAt = installation.last_seen as string;
                  return (
                    <TableRow key={String(installation.id)}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={
                              isOnline(seenAt) && active
                                ? "size-2 shrink-0 rounded-full bg-emerald-500"
                                : "size-2 shrink-0 rounded-full bg-muted-foreground/30"
                            }
                          />
                          {String(installation.name ?? "Sin nombre")}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {String(installation.id)}
                      </TableCell>
                      <TableCell className="font-mono text-xs tracking-wider">
                        {String(installation.license_key)}
                      </TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">
                        {String(installation.license_email ?? "—")}
                      </TableCell>
                      <TableCell>
                        {active ? (
                          <span className="text-emerald-500">Con acceso</span>
                        ) : (
                          <span className="text-destructive">
                            {installation.license_status == null
                              ? "Sin licencia"
                              : "Revocada"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Tener túnel es opcional: la mayoría no publicará su
                            panel, y ahí un guion dice más que una celda vacía. */}
                        {installation.tunnel_hostname ? (
                          <a
                            href={`https://${String(installation.tunnel_hostname)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {String(installation.tunnel_hostname)}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {relativeSince(seenAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(installation.first_seen as string)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
