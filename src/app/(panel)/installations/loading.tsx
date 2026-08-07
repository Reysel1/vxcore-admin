import {
  PageHeaderSkeleton,
  TableCardSkeleton,
} from "@/components/admin/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableCardSkeleton rows={5} columns={7} />
    </div>
  );
}
