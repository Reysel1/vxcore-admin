import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Título + subtítulo de cabecera de página. */
export function PageHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
    </div>
  );
}

/** Fila de tarjetas de estadísticas de la portada. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start justify-between p-5">
            <div className="flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
            <Skeleton className="size-9 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Tarjeta con una tabla dentro. */
export function TableCardSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-3 border-b border-border pb-3">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton
                key={c}
                className="h-4 flex-1"
                // Ancho ligeramente variable: una parrilla perfectamente
                // uniforme se lee como un error de carga, no como contenido.
                style={{ opacity: 1 - r * 0.12 }}
              />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Tarjeta genérica con unas líneas de texto. */
export function FormCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        ))}
        <Skeleton className="h-9 w-40 self-end" />
      </CardContent>
    </Card>
  );
}
