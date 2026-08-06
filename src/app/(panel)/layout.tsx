import { Sidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth";
import { totalUnreadForStaff } from "@/lib/db";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  const chatUnread = totalUnreadForStaff();

  return (
    <div className="flex min-h-dvh">
      <Sidebar chatUnread={chatUnread} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}
