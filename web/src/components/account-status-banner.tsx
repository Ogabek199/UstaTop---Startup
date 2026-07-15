"use client";

import { Ban, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccountStatusBanner({
  blocked,
  blockedTitle,
  blockedDesc,
  activeTitle,
  activeDesc,
  showActive = true,
  className,
}: {
  blocked: boolean;
  blockedTitle: string;
  blockedDesc: string;
  activeTitle: string;
  activeDesc: string;
  showActive?: boolean;
  className?: string;
}) {
  if (!blocked && !showActive) return null;

  if (blocked) {
    return (
      <div
        role="alert"
        className={cn(
          "rounded-2xl border border-error/25 bg-error/5 p-4 shadow-sm",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <Ban className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-error">{blockedTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-error/80">
              {blockedDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-success/25 bg-success/5 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-success">{activeTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-success/80">
            {activeDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
