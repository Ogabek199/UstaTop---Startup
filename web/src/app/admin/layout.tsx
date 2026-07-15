"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  ClipboardList,
  LogOut,
  Shield,
  Settings,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useI18n } from "@/i18n/provider";
import { PageContainer } from "@/components/page-container";
import { LanguageSelect } from "@/components/language-select";
import { Spinner } from "@/components/loading";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const NAV = [
  {
    href: "/admin",
    icon: BarChart3,
    labelKey: "adminStats" as const,
    exact: true,
  },
  { href: "/admin/users", icon: Users, labelKey: "adminUsers" as const },
  {
    href: "/admin/orders",
    icon: ClipboardList,
    labelKey: "adminOrders" as const,
  },
  {
    href: "/admin/settings",
    icon: Settings,
    labelKey: "settings" as const,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout, setUser, user } = useAuth();
  const { accessToken, isReady, isAdmin } = useRequireAdmin();
  const { t, locale } = useI18n();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isReady || !accessToken || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const changeLanguage = async (lang: typeof locale) => {
    if (!accessToken) return;
    const updated = await api.updateMe(accessToken, { language: lang });
    setUser(updated);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/90 shadow-sm shadow-primary/5 backdrop-blur-xl">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40" />

        <PageContainer className="flex h-14 items-center justify-between gap-3 sm:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/25">
              <Shield className="h-[18px] w-[18px]" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-primary sm:text-[15px]">
                {t.adminPanel}
              </p>
              <p className="truncate text-[11px] text-muted">{t.appName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelect onChange={changeLanguage} />
            {user && (
              <Link
                href="/admin/settings"
                className="hidden items-center gap-2 rounded-xl border border-border/70 bg-accent-soft/40 py-1 pl-1 pr-2.5 transition hover:border-accent/40 sm:flex"
              >
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                  className="!h-7 !w-7 !text-[10px]"
                />
                <span className="max-w-[100px] truncate text-xs font-semibold text-primary">
                  {user.name?.trim() || t.roleAdmin}
                </span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 text-muted transition hover:border-error/40 hover:bg-error/5 hover:text-error"
              aria-label={t.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </PageContainer>

        <PageContainer className="pb-3">
          <nav className="flex gap-1 overflow-x-auto scroll-area rounded-xl border border-border/60 bg-background/80 p-1">
            {NAV.map(({ href, icon: Icon, labelKey, exact }) => {
              const active = exact
                ? pathname === href
                : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                    active
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-muted hover:bg-white hover:text-primary",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "scale-105")} />
                  {t[labelKey]}
                </Link>
              );
            })}
          </nav>
        </PageContainer>
      </header>

      <PageContainer className="py-5">{children}</PageContainer>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-logout-confirm-title"
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-4 pt-5">
              <h2
                id="admin-logout-confirm-title"
                className="text-lg font-bold text-primary"
              >
                {t.logoutConfirmTitle}
              </h2>
              <p className="mt-2 text-sm text-muted">{t.logoutConfirmMessage}</p>
            </div>
            <div className="flex gap-3 border-t border-border p-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t.cancel}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                onClick={handleLogout}
              >
                {t.logoutConfirmYes}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
