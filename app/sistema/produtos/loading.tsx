import { Skeleton } from "@/components/ui/skeleton";

export default function ProdutosLoading() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-[300px]" />
        <Skeleton className="h-4 w-[450px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[450px_1fr]">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    </div>
  );
}
