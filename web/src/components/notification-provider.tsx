"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import {
  connectNotificationStream,
  subscribeToPush,
} from "@/lib/notifications";
import { NotificationToast } from "@/components/notification-toast";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuth((s) => s.accessToken);
  const hydrated = useAuth((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    return connectNotificationStream(
      () => useAuth.getState().accessToken,
      (notification) => {
        useNotifications.getState().addNotification(notification);
      },
    );
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void subscribeToPush(accessToken).catch(() => {
      // Push is optional — user may deny permission
    });
  }, [hydrated, accessToken]);

  return (
    <>
      {children}
      <NotificationToast />
    </>
  );
}
