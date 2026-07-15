"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";

/** Clientda localStorage dan auth yuklanishini kutadi */
export function AuthHydration({ children }: { children: React.ReactNode }) {
  const hydrated = useAuth((s) => s.hydrated);
  const setHydrated = useAuth((s) => s.setHydrated);

  useEffect(() => {
    if (useAuth.persist.hasHydrated()) {
      setHydrated();
    }
    return useAuth.persist.onFinishHydration(() => setHydrated());
  }, [setHydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
