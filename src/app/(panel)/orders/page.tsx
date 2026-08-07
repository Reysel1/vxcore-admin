import { ReceiptText } from "lucide-react";

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
import { MarkPaidButton } from "@/components/admin/order-actions";
import { listOrders } from "@/lib/db";

function formatMoney(cents: number | null | undefined): string {
  return `${((cents ?? 0) / 100).toFixed(2)} €`;
}

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

export default function OrdersPage() {
  const orders = listOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Pedidos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos los pedidos generados desde la web. Si un pago se completó pero
          el webhook no llegó, puedes marcarlo como pagado manualmente (crea
          también la licencia).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-muted-foreground" />
            Todos los pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Sin pedidos todavía"
              description="Se crean cuando un usuario pulsa «Pagar con Stripe» en su panel."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sesión Stripe</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={String(order.id)}>
                    <TableCell className="max-w-44 truncate font-medium">
                      {String(order.user_email)}
                    </TableCell>
                    <TableCell>{String(order.plan_name)}</TableCell>
                    <TableCell>
                      {formatMoney(order.amount_cents as number | null)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          order.status === "paid"
                            ? "text-emerald-500"
                            : "text-amber-500"
                        }
                      >
                        {order.status === "paid" ? "Pagado" : "Pendiente"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.created_at as string)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                      {String(order.stripe_session_id ?? "—")}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status !== "paid" && (
                        <MarkPaidButton orderId={Number(order.id)} />
                      )}
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
