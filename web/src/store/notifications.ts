"use client";

import { create } from "zustand";
import type { AppNotification } from "@/lib/notifications";

interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
  toast: AppNotification | null;
  setItems: (items: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  showToast: (notification: AppNotification) => void;
  clearToast: () => void;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  toast: null,
  setItems: (items) => set({ items }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  addNotification: (notification) => {
    const exists = get().items.some((item) => item.id === notification.id);
    if (exists) return;

    set((state) => ({
      items: [notification, ...state.items].slice(0, 50),
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
      toast: notification,
    }));
  },
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount -
          (state.items.find((item) => item.id === id && !item.isRead) ? 1 : 0),
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: 0,
    })),
  showToast: (notification) => set({ toast: notification }),
  clearToast: () => set({ toast: null }),
}));
