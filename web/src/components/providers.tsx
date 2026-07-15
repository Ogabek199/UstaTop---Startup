"use client";

import { I18nProvider } from "@/i18n/provider";
import { BottomNav } from "@/components/bottom-nav";
import { AuthHydration } from "@/components/auth-hydration";
import { NotificationProvider } from "@/components/notification-provider";
import { ErrorReporter } from "@/components/error-reporter";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthHydration>
      <I18nProvider>
        <NotificationProvider>
          <ErrorReporter />
          {children}
          <BottomNav />
        </NotificationProvider>
      </I18nProvider>
    </AuthHydration>
  );
}
