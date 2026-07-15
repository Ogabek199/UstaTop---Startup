"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, User, LayoutDashboard, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useI18n } from "@/i18n/provider";

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const { t } = useI18n();

  const isPro = user?.role === "professional";
  const isAdmin = user?.role === "admin";

  const items = isAdmin
    ? [
        { href: "/admin", icon: Shield, label: t.admin },
        { href: "/admin/users", icon: Users, label: t.adminUsers },
        { href: "/admin/orders", icon: ClipboardList, label: t.adminOrders },
        { href: "/profile", icon: User, label: t.profile },
      ]
    : isPro
      ? [
          { href: "/dashboard", icon: LayoutDashboard, label: t.dashboard },
          { href: "/orders", icon: ClipboardList, label: t.ordersNav },
          { href: "/profile", icon: User, label: t.profile },
        ]
      : [
          { href: "/", icon: Home, label: t.home },
          { href: "/orders", icon: ClipboardList, label: t.ordersNav },
          { href: "/profile", icon: User, label: t.profile },
        ];

  if (pathname.startsWith("/login") || pathname.startsWith("/admin")) return null;

  const activeColor = isPro || isAdmin ? "text-primary" : "text-accent";
  const activeBg = isPro || isAdmin ? "bg-primary/10" : "bg-accent-soft";
  const activeDot = isPro || isAdmin ? "bg-primary" : "bg-accent";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="mx-auto w-full max-w-lg px-5 md:max-w-3xl md:px-8 lg:max-w-6xl">
        <div
          className={cn(
            "pointer-events-auto flex h-14 w-full items-center justify-around rounded-2xl border px-1.5 shadow-[0_8px_32px_rgba(31,78,95,0.14),0_2px_8px_rgba(31,78,95,0.06)] backdrop-blur-xl",
            isPro || isAdmin
              ? "border-primary/10 bg-white/92"
              : "border-accent/15 bg-white/92",
          )}
        >

          {items.map(({ href, icon: Icon, label }) => {
            const active =
              href === "/" || href === "/admin"
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all duration-200",
                  active ? activeColor : "text-muted hover:text-foreground/70",
                )}
              >
                {active && (
                  <span
                    className={cn(
                      "absolute inset-x-1.5 inset-y-0.5 rounded-xl",
                      activeBg,
                    )}
                    aria-hidden
                  />
                )}
                <span className="relative flex flex-col items-center gap-0.5">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      active && "scale-105 stroke-[2.25]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold leading-none tracking-wide",
                      active && "font-bold",
                    )}
                  >
                    {label}
                  </span>
                  {active && (
                    <span
                      className={cn("h-0.5 w-0.5 rounded-full", activeDot)}
                      aria-hidden
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
