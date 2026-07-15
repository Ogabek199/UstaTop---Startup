import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

const spinnerSizes: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[2.5px]",
  lg: "h-12 w-12 border-[3px]",
};

export function Spinner({
  size = "md",
  light = false,
  className,
}: {
  size?: SpinnerSize;
  light?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative inline-flex shrink-0", className)}
    >
      <div
        className={cn(
          "rounded-full animate-spin",
          light ? "border-white/25 border-t-white" : "border-accent/20 border-t-accent",
          spinnerSizes[size],
        )}
      />
      <div
        className={cn(
          "absolute inset-0 rounded-full border-transparent animate-spin [animation-duration:1.5s] [animation-direction:reverse]",
          light ? "border-r-white/50" : "border-r-primary/40",
          spinnerSizes[size],
        )}
      />
    </div>
  );
}

export function Skeleton({
  className,
  shimmer = true,
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl",
        shimmer ? "skeleton-shimmer" : "animate-pulse bg-muted/60",
        className,
      )}
    />
  );
}

export function PageLoader({
  label,
  className,
  minHeight = "min-h-[50vh]",
}: {
  label?: string;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-5",
        minHeight,
        className,
      )}
    >
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft/60 shadow-inner">
        <Spinner size="lg" />
      </div>
      {label && (
        <p className="text-sm font-medium text-muted animate-pulse">{label}</p>
      )}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 md:h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function ProCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProCardListSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 md:gap-4 lg:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex justify-between pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
    </div>
  );
}

export function OrderListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="mt-4 h-12 w-full rounded-lg" />
    </div>
  );
}

export function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfessionalPageSkeleton() {
  return (
    <div className="min-h-screen pb-nav">
      <Skeleton className="h-44 rounded-none" shimmer />
      <div className="mx-auto max-w-3xl -mt-8 space-y-4 px-5">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-5 py-5">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}
