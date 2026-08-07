import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  TableCardSkeleton,
} from "@/components/admin/skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full max-w-md" />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <TableCardSkeleton rows={5} columns={4} />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
