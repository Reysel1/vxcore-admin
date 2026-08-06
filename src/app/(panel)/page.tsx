import {
  CircleDollarSign,
  KeyRound,
  MessageSquareText,
  PackageOpen,
  ReceiptText,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLatestInstaller, getStats, listContacts, listOrders } from "@/lib/db";

function formatMoney(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatDate(sqlDate?: string | null): string {
  if (!sqlDate) return "—";
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOverviewPage() {
  const stats = getStats();
  const orders = listOrders().slice(0, 6);
  const contacts = listContacts().slice(0, 4);
  const installer = getLatestInstaller();

  const cards = [
    {
      label: "Usuarios",
      value: String(stats.users),
      hint: `+${stats.newUsersWeek} esta semana`,
      icon: Users,
    },
    {
      label: "Ingresos",
      value: formatMoney(Number(stats.revenueCents)),
      hint: `${stats.paidOrders} pedidos pagados`,
      icon: CircleDollarSign,
    },
    {
      label: "Licencias activas",
      value: String(stats.licensesActive),
      hint: `${stats.licensesTotal} en total`,
      icon: KeyRound,
    },
    {
      label: "Contactos nuevos",
      value: String(stats.contactsNew),
      hint: `${stats.contactsTotal} en total`,
      icon: MessageSquareText,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Inicio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de tu negocio VXCore.
        </p>
      </div>

      {/* Tarjetas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
                <card.icon className="size-4.5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instalador publicado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="size-4 text-muted-foreground" />
            Instalador publicado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {installer ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="font-semibold">
                v{String(installer.version)}
              </span>
              <span className="text-muted-foreground">
                {String(installer.filename)}
              </span>
              <span className="text-muted-foreground">
                {(Number(installer.size_bytes) / 1024 / 1024).toFixed(1)} MB
              </span>
              <span className="text-xs text-muted-foreground">
                Publicado {formatDate(installer.created_at as string)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no has publicado ningún instalador. Ve a{" "}
              <a href="/installers" className="text-foreground underline underline-offset-4">
                Instaladores
              </a>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Pedidos recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-muted-foreground" />
              Pedidos recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pedidos aún.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={String(order.id)}>
                      <TableCell className="max-w-44 truncate">
                        {String(order.user_email)}
                      </TableCell>
                      <TableCell>
                        {formatMoney(Number(order.amount_cents ?? 0))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            order.status === "paid"
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          {order.status === "paid" ? "Pagado" : "Pendiente"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.created_at as string)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Mensajes recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="size-4 text-muted-foreground" />
              Mensajes recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin mensajes todavía. La sección de contacto de la web los
                recoge aquí.
              </p>
            ) : (
              contacts.map((c) => (
                <a
                  key={String(c.id)}
                  href="/contacts"
                  className="rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:border-foreground/25"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {String(c.subject)}
                    </span>
                    {c.status === "new" && (
                      <span className="size-2 shrink-0 rounded-full bg-foreground" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {String(c.name)} · {formatDate(c.created_at as string)}
                  </p>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
