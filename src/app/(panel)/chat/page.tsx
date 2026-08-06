import { ChatAdmin } from "@/components/admin/chat";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Chat con usuarios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversaciones del chat del panel de usuario. Responde aquí y el
          usuario lo ve al momento.
        </p>
      </div>

      <ChatAdmin />
    </div>
  );
}
