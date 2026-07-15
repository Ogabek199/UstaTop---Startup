"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";

export function useRequireAdmin() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { accessToken, hydrated, isReady, isAuthenticated } = useRequireAuth();

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    if (user && user.role !== "admin") {
      router.replace(user.role === "professional" ? "/dashboard" : "/");
    }
  }, [hydrated, accessToken, user, router]);

  return {
    accessToken,
    user,
    hydrated,
    isReady,
    isAuthenticated,
    isAdmin: user?.role === "admin",
  };
}
