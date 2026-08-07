import { TicketsAdmin } from "@/components/admin/tickets";

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Tickets de soporte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los tickets que abren los usuarios desde su panel. Selecciona uno
          para ver la conversación y responder.
        </p>
      </div>

      <TicketsAdmin />
    </div>
  );
}
