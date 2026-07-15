"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: items.length,
    pageSize,
  };
}

function getVisiblePages(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = page - 1; p <= page + 1; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  labels,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  labels: { prev: string; next: string };
}) {
  if (total <= pageSize || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = getVisiblePages(page, totalPages);

  return (
    <div className="flex flex-col items-center gap-3 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
      <p className="text-xs font-medium tabular-nums text-muted">
        {from}–{to} / {total}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={labels.prev}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-primary transition",
            page <= 1
              ? "cursor-not-allowed opacity-40"
              : "hover:border-accent hover:bg-accent-soft",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-9 min-w-9 items-center justify-center text-sm text-muted"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition",
                p === page
                  ? "bg-accent text-white shadow-sm"
                  : "border border-border text-muted hover:border-accent hover:text-primary",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={labels.next}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-primary transition",
            page >= totalPages
              ? "cursor-not-allowed opacity-40"
              : "hover:border-accent hover:bg-accent-soft",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export {
  PAGE_SIZE,
  PAGE_SIZE as RECENT_JOBS_PAGE_SIZE,
  PAGE_SIZE as ORDERS_PAGE_SIZE,
};
