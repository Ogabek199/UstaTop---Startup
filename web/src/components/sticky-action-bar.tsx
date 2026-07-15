import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className="fixed left-0 right-0 z-40 px-4 pointer-events-none"
      style={{
        bottom:
          "calc(5.5rem + 0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-6xl",
          "rounded-2xl border border-accent/15 bg-white/95 backdrop-blur-xl",
          "shadow-[0_8px_32px_rgba(31,78,95,0.12),0_2px_8px_rgba(31,78,95,0.06)]",
          "px-4 py-3 md:px-5 md:py-3.5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
