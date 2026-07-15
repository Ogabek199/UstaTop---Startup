"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";

import { cn } from "@/lib/utils";

type NotificationBellProps = {
  variant?: "default" | "onDark";
};

export function NotificationBell({ variant = "default" }: NotificationBellProps) {
  const accessToken = useAuth((s) => s.accessToken);
  const hydrated = useAuth((s) => s.hydrated);
  const items = useNotifications((s) => s.items);
  const unreadCount = useNotifications((s) => s.unreadCount);
  const setItems = useNotifications((s) => s.setItems);
  const setUnreadCount = useNotifications((s) => s.setUnreadCount);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    void api.getNotifications(accessToken).then(setItems);
    void api.getUnreadNotificationCount(accessToken).then((res) => {
      setUnreadCount(res.count);
    });
  }, [hydrated, accessToken, setItems, setUnreadCount]);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const buttonClass =
    variant === "onDark"
      ? "bg-transparent border border-white/30 text-white hover:bg-white/10"
      : "bg-transparent border border-border text-primary hover:bg-accent-soft/50";

  if (!hydrated || !accessToken) {
    return (
      <button
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full opacity-50",
          buttonClass,
        )}
        disabled
      >
        <Bell className="h-4 w-4" />
      </button>
    );
  }

  const handleMarkRead = async (id: string) => {
    markRead(id);
    await api.markNotificationRead(accessToken, id);
    const res = await api.getUnreadNotificationCount(accessToken);
    setUnreadCount(res.count);
  };

  const handleMarkAllRead = async () => {
    markAllRead();
    await api.markAllNotificationsRead(accessToken);
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full transition",
          buttonClass,
        )}
        aria-label="Bildirishnomalar"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-h-96 overflow-hidden rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold text-sm text-primary">Bildirishnomalar</p>
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium text-accent"
              >
                Barchasini o&apos;qilgan
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Bildirishnomalar yo&apos;q
              </p>
            ) : (
              items.map((item) => {
                const orderId = item.data?.orderId;
                const content = (
                  <div
                    className={`px-4 py-3 border-b border-border/50 ${!item.isRead ? "bg-accent-soft/40" : ""}`}
                  >
                    <p className="text-sm font-semibold text-primary">{item.title}</p>
                    <p className="text-xs text-muted mt-1">{item.body}</p>
                    <p className="text-[10px] text-muted mt-2">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                        locale: uz,
                      })}
                    </p>
                  </div>
                );

                if (orderId) {
                  return (
                    <Link
                      key={item.id}
                      href={`/orders/${orderId}`}
                      onClick={() => {
                        if (!item.isRead) void handleMarkRead(item.id);
                        setOpen(false);
                      }}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    className="w-full text-left"
                    onClick={() => {
                      if (!item.isRead) void handleMarkRead(item.id);
                    }}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
