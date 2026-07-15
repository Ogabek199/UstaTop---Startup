"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useNotifications } from "@/store/notifications";

export function NotificationToast() {
  const toast = useNotifications((s) => s.toast);
  const clearToast = useNotifications((s) => s.clearToast);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => clearToast(), 5000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [toast, clearToast]);

  if (!toast) return null;

  const orderId = toast.data?.orderId;

  return (
    <div className="fixed top-20 right-4 left-4 z-50 mx-auto max-w-md">
      <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-md p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary text-sm">{toast.title}</p>
            <p className="text-sm text-muted mt-1">{toast.body}</p>
            {orderId && (
              <Link
                href={`/orders/${orderId}`}
                onClick={clearToast}
                className="inline-block mt-2 text-xs font-semibold text-accent"
              >
                Buyurtmani ko&apos;rish
              </Link>
            )}
          </div>
          <button
            onClick={clearToast}
            className="shrink-0 rounded-full p-1 text-muted hover:bg-accent-soft"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
