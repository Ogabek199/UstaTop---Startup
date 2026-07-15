"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollableList({
  children,
  className,
  hint,
}: {
  children: React.ReactNode;
  className?: string;
  hint: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const updateState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollHeight > el.clientHeight + 4;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setHasOverflow(overflow);
    setShowHint(overflow && !atBottom);
  }, []);

  useEffect(() => {
    updateState();
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(updateState);
    observer.observe(el);
    el.addEventListener("scroll", updateState, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateState);
    };
  }, [children, updateState]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          "scroll-area max-h-56 overscroll-contain",
          hasOverflow ? "scroll-area-visible overflow-y-scroll" : "overflow-hidden",
          className,
        )}
      >
        {children}
      </div>
      {showHint && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center"
          aria-hidden
        >
          <div className="h-10 w-full bg-gradient-to-t from-white via-white/70 to-transparent" />
          <span className="absolute bottom-1 flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium text-accent shadow-sm border border-border/60">
            <ChevronDown className="h-3 w-3 animate-bounce" />
            {hint}
          </span>
        </div>
      )}
    </div>
  );
}
