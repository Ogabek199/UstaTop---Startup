import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, locale = "uz") {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(
    amount,
  );
}

/** Keep only digits from a price input (e.g. "150 000" → "150000"). */
export function parsePriceInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

/** Format digit string for display while typing (e.g. "150000" → "150 000"). */
export function formatPriceInput(digits: string, locale = "uz"): string {
  if (!digits) return "";
  return formatPrice(Number(digits), locale);
}

