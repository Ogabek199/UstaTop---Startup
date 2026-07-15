"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuth((s) => s.accessToken);
  const hydrated = useAuth((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !accessToken) {
      const redirect = pathname && pathname !== "/login" ? pathname : "";
      router.replace(
        redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login",
      );
    }
  }, [hydrated, accessToken, router, pathname]);

  return {
    accessToken,
    hydrated,
    isAuthenticated: !!accessToken,
    isReady: hydrated,
  };
}
