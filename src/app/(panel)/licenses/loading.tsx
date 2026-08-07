import {
  FormCardSkeleton,
  PageHeaderSkeleton,
  TableCardSkeleton,
} from "@/components/admin/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormCardSkeleton lines={1} />
      <TableCardSkeleton rows={6} columns={6} />
    </div>
  );
}
