"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n";
import { cn } from "@/lib/utils";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "uz", label: "UZ", flag: "🇺🇿" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
];

type LanguageSelectProps = {
  className?: string;
  buttonClassName?: string;
  variant?: "default" | "onDark";
  onChange?: (locale: Locale) => void;
};

export function LanguageSelect({
  className,
  buttonClassName,
  variant = "default",
  onChange,
}: LanguageSelectProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const active = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  const select = (code: Locale) => {
    setLocale(code);
    onChange?.(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
          variant === "onDark"
            ? "border-white/30 bg-transparent text-white hover:bg-white/10"
            : "border-border bg-accent-soft text-primary hover:bg-accent-soft/80",
          buttonClassName,
        )}
      >
        <span className="text-sm leading-none" aria-hidden>
          {active.flag}
        </span>
        {active.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition",
            variant === "onDark" ? "text-white/80" : "text-muted",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 min-w-[7.5rem] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {LOCALES.map((item) => (
            <li
              key={item.code}
              role="option"
              aria-selected={locale === item.code}
            >
              <button
                type="button"
                onClick={() => select(item.code)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition",
                  locale === item.code
                    ? "bg-accent-soft text-accent"
                    : "text-primary hover:bg-accent-soft/60",
                )}
              >
                <span className="text-sm leading-none" aria-hidden>
                  {item.flag}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
