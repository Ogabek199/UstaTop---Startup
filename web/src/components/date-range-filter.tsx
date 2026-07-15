"use client";

import { useEffect, useRef } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ru, uz } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateFull, formatDateRange } from "@/lib/date";
import type { Locale } from "@/i18n";
import "react-day-picker/style.css";

export type AppliedDateRange = { from: Date; to: Date };

function pickerLocale(locale: Locale) {
  return locale === "ru" ? ru : uz;
}

function toDateParam(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateRangeToParams(range: AppliedDateRange) {
  return { from: toDateParam(range.from), to: toDateParam(range.to) };
}

export function defaultDateRange(): AppliedDateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function DateRangeFilter({
  open,
  onOpenChange,
  appliedRange,
  draftRange,
  onDraftChange,
  onApply,
  locale,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appliedRange: AppliedDateRange;
  draftRange: DateRange | undefined;
  onDraftChange: (range: DateRange | undefined) => void;
  onApply: () => void;
  locale: Locale;
  labels: {
    filter: string;
    selectPeriod: string;
    confirm: string;
    cancel: string;
  };
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const canApply = Boolean(draftRange?.from && draftRange?.to);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onDraftChange({ from: appliedRange.from, to: appliedRange.to });
          onOpenChange(true);
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:border-accent hover:shadow-md",
        )}
      >
        <CalendarDays className="h-4 w-4 text-accent" />
        <span>{labels.filter}</span>
        <span className="hidden sm:inline text-muted font-medium">
          · {formatDateRange(appliedRange.from, appliedRange.to, locale)}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => onOpenChange(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={labels.selectPeriod}
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-bold text-primary">{labels.selectPeriod}</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 text-muted hover:bg-accent-soft hover:text-primary transition"
                aria-label={labels.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center px-3 py-4 rdp-theme">
              <DayPicker
                mode="range"
                selected={draftRange}
                onSelect={onDraftChange}
                locale={pickerLocale(locale)}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
                defaultMonth={draftRange?.from ?? appliedRange.from}
                formatters={{
                  formatCaption: (date) =>
                    format(date, "LLLL yyyy", { locale: pickerLocale(locale) }),
                  formatWeekdayName: (date) =>
                    format(date, "ccccc", { locale: pickerLocale(locale) }),
                }}
              />
            </div>

            {draftRange?.from && (
              <p className="px-5 text-center text-sm text-muted">
                {draftRange.to
                  ? formatDateRange(draftRange.from, draftRange.to, locale)
                  : formatDateFull(draftRange.from, locale)}
              </p>
            )}

            <div className="flex gap-3 border-t border-border p-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {labels.cancel}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!canApply}
                onClick={() => {
                  onApply();
                  onOpenChange(false);
                }}
              >
                {labels.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
