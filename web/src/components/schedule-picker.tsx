"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  format,
  isBefore,
  isToday,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { ru, uz } from "date-fns/locale";
import { ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateFull } from "@/lib/date";
import type { Locale } from "@/i18n";
import "react-day-picker/style.css";

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hours = 8 + Math.floor(i / 2);
  const minutes = i % 2 === 0 ? 0 : 30;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

function pickerLocale(locale: Locale) {
  return locale === "ru" ? ru : uz;
}

function formatTimeLabel(time: string, locale: Locale) {
  const [h, m] = time.split(":").map(Number);
  const d = setMinutes(setHours(new Date(), h), m);
  return format(d, "HH:mm", { locale: pickerLocale(locale) });
}

export function isValidTimeValue(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function isTimeInPast(time: string, date: Date | undefined) {
  if (!date || !isValidTimeValue(time) || !isToday(date)) return false;
  const [h, m] = time.split(":").map(Number);
  const slotDate = setMinutes(setHours(new Date(), h), m);
  return isBefore(slotDate, new Date());
}

function isTimeSlotDisabled(slot: string, date: Date | undefined) {
  return isTimeInPast(slot, date);
}

export function buildScheduledAt(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return setMinutes(setHours(date, hours), minutes).toISOString();
}

function parseTimeParts(time: string): { hour: string; minute: string } {
  if (!isValidTimeValue(time)) {
    return { hour: "10", minute: "00" };
  }
  const [hour, rawMinute] = time.split(":");
  const minuteNum = Number(rawMinute);
  const snapped = String(Math.round(minuteNum / 5) * 5).padStart(2, "0");
  const minute = snapped === "60" ? "55" : snapped;
  return { hour, minute };
}

export function SchedulePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  locale,
  labels,
  errors,
}: {
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  locale: Locale;
  labels: {
    date: string;
    time: string;
    customTime: string;
    customTimeHint: string;
    hour?: string;
    minute?: string;
  };
  errors?: { date?: string; time?: string };
}) {
  const isCustomTime = Boolean(time) && !TIME_SLOTS.includes(time);
  const [customOpen, setCustomOpen] = useState(isCustomTime);
  const { hour, minute } = useMemo(() => parseTimeParts(time), [time]);

  const handleDateChange = (next: Date | undefined) => {
    onDateChange(next);
    if (next && time && isTimeInPast(time, next)) {
      onTimeChange("");
      setCustomOpen(false);
    }
  };

  const handleSlotSelect = (slot: string) => {
    setCustomOpen(false);
    onTimeChange(slot);
  };

  const applyCustom = (nextHour: string, nextMinute: string) => {
    const next = `${nextHour}:${nextMinute}`;
    if (date && isTimeInPast(next, date)) return;
    onTimeChange(next);
  };

  const openCustom = () => {
    setCustomOpen(true);
    const parts = parseTimeParts(time || "10:00");
    const candidate = `${parts.hour}:${parts.minute}`;
    if (!date || !isTimeInPast(candidate, date)) {
      onTimeChange(candidate);
    } else {
      // find next 5-min slot today
      const now = new Date();
      let h = now.getHours();
      let m = Math.ceil(now.getMinutes() / 5) * 5;
      if (m === 60) {
        h += 1;
        m = 0;
      }
      if (h > 23) {
        onTimeChange("23:55");
      } else {
        onTimeChange(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-muted mb-1.5 block">
          {labels.date} <span className="text-error">*</span>
        </label>
        <div
          className={cn(
            "flex justify-center rounded-xl border bg-white p-3 rdp-theme",
            errors?.date ? "border-error" : "border-border",
          )}
        >
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            locale={pickerLocale(locale)}
            disabled={{ before: startOfDay(new Date()) }}
            defaultMonth={date ?? new Date()}
            formatters={{
              formatCaption: (d) =>
                format(d, "LLLL yyyy", { locale: pickerLocale(locale) }),
              formatWeekdayName: (d) =>
                format(d, "ccccc", { locale: pickerLocale(locale) }),
            }}
          />
        </div>
        {errors?.date && (
          <p className="mt-1 text-xs text-error">{errors.date}</p>
        )}
      </div>

      {date && (
        <div>
          <label className="text-sm font-medium text-muted mb-1.5 block">
            {labels.time} <span className="text-error">*</span>
          </label>
          <p className="text-sm text-muted mb-2">{formatDateFull(date, locale)}</p>
          <div
            className={cn(
              "grid grid-cols-4 gap-2 rounded-xl border p-3",
              errors?.time && !isCustomTime && !customOpen
                ? "border-error"
                : "border-border bg-white",
            )}
          >
            {TIME_SLOTS.map((slot) => {
              const disabled = isTimeSlotDisabled(slot, date);
              const selected = time === slot && !customOpen;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSlotSelect(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm font-medium transition",
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white hover:border-accent hover:bg-accent-soft",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {formatTimeLabel(slot, locale)}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => (customOpen ? setCustomOpen(false) : openCustom())}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                customOpen || isCustomTime
                  ? "border-accent bg-accent-soft/60 ring-2 ring-accent/15"
                  : "border-border bg-white hover:border-accent/50 hover:bg-accent-soft/40",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    customOpen || isCustomTime
                      ? "bg-accent text-white"
                      : "bg-accent-soft text-accent",
                  )}
                >
                  <Clock className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-primary">
                    {labels.customTime}
                  </span>
                  <span className="block text-xs text-muted">
                    {customOpen || isCustomTime
                      ? formatTimeLabel(time || "10:00", locale)
                      : labels.customTimeHint}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted transition",
                  customOpen && "rotate-180 text-accent",
                )}
              />
            </button>

            {customOpen && (
              <div
                className={cn(
                  "mt-3 overflow-hidden rounded-2xl border bg-gradient-to-b from-accent-soft/50 to-white p-4 shadow-sm",
                  errors?.time && isCustomTime
                    ? "border-error"
                    : "border-accent/30",
                )}
              >
                <div className="mb-4 flex items-center justify-center">
                  <div className="rounded-2xl bg-white px-6 py-3 shadow-sm border border-accent/20">
                    <p className="text-center text-[11px] font-medium uppercase tracking-wider text-muted">
                      {labels.time}
                    </p>
                    <p className="text-center text-4xl font-bold tabular-nums tracking-tight text-primary">
                      {hour}
                      <span className="animate-pulse text-accent">:</span>
                      {minute}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted">
                      {labels.hour ?? "Soat"}
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {HOURS.map((h) => {
                        const candidate = `${h}:${minute}`;
                        const disabled = isTimeInPast(candidate, date);
                        const selected = hour === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={disabled}
                            onClick={() => applyCustom(h, minute)}
                            className={cn(
                              "h-11 w-11 shrink-0 rounded-xl border text-sm font-semibold tabular-nums transition",
                              selected
                                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                                : "border-border bg-white text-foreground hover:border-accent hover:bg-accent-soft",
                              disabled && "cursor-not-allowed opacity-35",
                            )}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted">
                      {labels.minute ?? "Daqiqa"}
                    </p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {MINUTES.map((m) => {
                        const candidate = `${hour}:${m}`;
                        const disabled = isTimeInPast(candidate, date);
                        const selected = minute === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={disabled}
                            onClick={() => applyCustom(hour, m)}
                            className={cn(
                              "h-10 rounded-xl border text-sm font-semibold tabular-nums transition",
                              selected
                                ? "border-accent bg-accent text-white shadow-md shadow-accent/25"
                                : "border-border bg-white text-foreground hover:border-accent hover:bg-accent-soft",
                              disabled && "cursor-not-allowed opacity-35",
                            )}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {errors?.time && (
            <p className="mt-1 text-xs text-error">{errors.time}</p>
          )}
        </div>
      )}
    </div>
  );
}
