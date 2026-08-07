import { PageHeaderSkeleton } from "@/components/admin/skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Barra de pestañas */}
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-2 h-3 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-3">
            <Skeleton className="h-5 w-56" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex h-[calc(100vh-24rem)] min-h-64 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
              {[
                "w-1/2 self-start",
                "w-2/5 self-end",
                "w-3/5 self-start",
                "w-1/3 self-end",
              ].map((cls, i) => (
                <Skeleton key={i} className={`h-10 rounded-2xl ${cls}`} />
              ))}
            </div>
            <Skeleton className="h-11 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
