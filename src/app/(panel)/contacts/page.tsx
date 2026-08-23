import { MessageSquareText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactActions } from "@/components/admin/contact-actions";
import { EmptyState } from "@/components/admin/empty-state";
import { listContacts } from "@/lib/db";

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

export default function ContactsPage() {
  const contacts = listContacts();
  const newCount = contacts.filter((c) => c.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Contactos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mensajes enviados desde la sección «Contacto» de la web.{" "}
          {newCount > 0 && (
            <span className="font-medium text-foreground">
              Tienes {newCount} sin leer.
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="size-4 text-muted-foreground" />
            Bandeja de mensajes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="Sin mensajes todavía"
              description="Aparecerán aquí cuando alguien use el formulario de contacto de la web."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Remitente</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={String(contact.id)}>
                    <TableCell>
                      {contact.status === "new" ? (
                        <span className="text-foreground">Nuevo</span>
                      ) : (
                        <span className="text-muted-foreground">Leído</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{String(contact.name)}</div>
                      <div className="text-xs text-muted-foreground">
                        {String(contact.email)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-44 truncate font-medium">
                      {String(contact.subject)}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {String(contact.message)}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(contact.created_at as string)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ContactActions
                        id={Number(contact.id)}
                        email={String(contact.email)}
                        status={contact.status as "new" | "read"}
                        subject={String(contact.subject)}
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
