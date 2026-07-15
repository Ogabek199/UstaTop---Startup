"use client";

import { ChevronDown } from "lucide-react";
import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, value, defaultValue, ...props }, ref) => {
  const current = value ?? defaultValue ?? "";
  const isEmpty = current === "" || current === undefined;

  return (
    <div className="relative">
      <select
        ref={ref}
        {...props}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "flex h-12 w-full appearance-none rounded-xl border border-border bg-white px-4 pr-10 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
          isEmpty ? "text-muted" : "text-foreground",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
});
Select.displayName = "Select";
