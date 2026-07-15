import { format, parseISO } from "date-fns";
import { ru, uz } from "date-fns/locale";
import type { Locale } from "@/i18n";

function dateFnsLocale(locale: Locale) {
  return locale === "ru" ? ru : uz;
}

/** "2026-07" → "Iyul 2026" */
export function formatMonthKey(monthKey: string, locale: Locale) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return format(date, "LLLL yyyy", { locale: dateFnsLocale(locale) });
}

/** "2026-07" → "Iyul" (chart label) */
export function formatMonthShort(monthKey: string, locale: Locale) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const label = format(date, "LLL", { locale: dateFnsLocale(locale) });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDayLabel(dateStr: string, locale: Locale) {
  const date = parseISO(dateStr.length === 10 ? dateStr : dateStr.slice(0, 10));
  return format(date, "EEE, d MMM", { locale: dateFnsLocale(locale) });
}

export function formatDateFull(date: Date, locale: Locale) {
  return format(date, "d MMMM yyyy", { locale: dateFnsLocale(locale) });
}

export function formatDateRange(from: Date, to: Date, locale: Locale) {
  return `${formatDateFull(from, locale)} — ${formatDateFull(to, locale)}`;
}

export function formatDateTime(dateStr: string, locale: Locale) {
  return format(new Date(dateStr), "d MMM, HH:mm", {
    locale: dateFnsLocale(locale),
  });
}
