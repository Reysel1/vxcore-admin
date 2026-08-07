import { Sidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth";
import { getDbError, totalUnreadForStaff } from "@/lib/db";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  const chatUnread = totalUnreadForStaff();
  const dbError = getDbError();

  return (
    <div className="flex min-h-dvh">
      <Sidebar chatUnread={chatUnread} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {dbError ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            <p className="font-medium">
              Base de datos no configurada — modo degradado (datos no
              persistentes)
            </p>
            <p className="mt-1 text-xs opacity-80">
              Añade <code>TURSO_DATABASE_URL</code> y{" "}
              <code>TURSO_AUTH_TOKEN</code> en Vercel (Proyecto → Settings →
              Environment Variables) y vuelve a desplegar. Mientras tanto
              puedes explorar la interfaz, pero los cambios no se guardarán.
            </p>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
