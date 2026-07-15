"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Globe,
  LayoutDashboard,
  ClipboardList,
  User as UserIcon,
  Wrench,
  Shield,
  HelpCircle,
  Camera,
  Star,
  Send,
  CheckCircle2,
  Loader2,
  Settings,
  ChevronRight,
  MessageSquarePlus,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { usePolling } from "@/hooks/use-polling";
import { useI18n } from "@/i18n/provider";
import { api, ApiError } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/page-container";
import { UserAvatar } from "@/components/user-avatar";
import { LanguageSelect } from "@/components/language-select";
import { AccountStatusBanner } from "@/components/account-status-banner";
import { formatPhoneDisplay } from "@/lib/phone";
import type { Locale } from "@/i18n";
import type { User } from "@/lib/api";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getRoleInfo(
  role: User["role"],
  t: {
    roleCustomer: string;
    roleProfessional: string;
    roleAdmin: string;
    roleCustomerDesc: string;
    roleProfessionalDesc: string;
  },
) {
  switch (role) {
    case "professional":
      return {
        label: t.roleProfessional,
        desc: t.roleProfessionalDesc,
        icon: Wrench,
        badgeVariant: "accent" as const,
        headerClass: "bg-accent/20 text-white border-white/30",
      };
    case "admin":
      return {
        label: t.roleAdmin,
        desc: "",
        icon: Shield,
        badgeVariant: "warning" as const,
        headerClass: "bg-warning/20 text-white border-white/30",
      };
    default:
      return {
        label: t.roleCustomer,
        desc: t.roleCustomerDesc,
        icon: UserIcon,
        badgeVariant: "primary" as const,
        headerClass: "bg-white/20 text-white border-white/30",
      };
  }
}

export default function ProfilePage() {
  const { user, accessToken, logout, setUser } = useAuth();
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [telegramConnected, setTelegramConnected] = useState<boolean | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomer = user?.role === "customer";
  const isProfessional = user?.role === "professional";

  const refreshAccountStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const me = await api.getMe(accessToken);
      setUser(me);
    } catch {
      // ignore
    }
  }, [accessToken, setUser]);

  useEffect(() => {
    void refreshAccountStatus();
  }, [refreshAccountStatus]);

  usePolling(
    refreshAccountStatus,
    !!accessToken && isAuthenticated,
    15000,
  );

  const refreshTelegramStatus = useCallback(async () => {
    if (!accessToken || !isCustomer) return;
    try {
      const res = await api.getCustomerTelegramStatus(accessToken);
      setTelegramConnected(res.connected);
      if (res.connected) setTelegramLink(null);
      else if (res.link) setTelegramLink(res.link);
    } catch {
      // ignore
    }
  }, [accessToken, isCustomer]);

  useEffect(() => {
    void refreshTelegramStatus();
  }, [refreshTelegramStatus]);

  usePolling(
    refreshTelegramStatus,
    !!accessToken && isCustomer && !telegramConnected,
    3000,
  );

  const changeLanguage = async (lang: Locale) => {
    if (!accessToken) return;
    const updated = await api.updateMe(accessToken, { language: lang });
    setUser(updated);
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;

    setUploadError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setUploadError(t.photoInvalidType);
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setUploadError(t.photoTooLarge);
      return;
    }

    setUploading(true);
    try {
      const updated = await api.uploadAvatar(accessToken, file);
      setUser(updated);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : t.photoUploadError,
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!isReady || !isAuthenticated || !user) return null;

  const roleInfo = getRoleInfo(user.role, t);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen pb-nav">
      <div className="bg-gradient-to-br from-primary to-accent pt-8 pb-12">
        <PageContainer className="flex items-center gap-4">
          <div className="relative shrink-0">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="border-2 border-white/40 bg-white/20 text-white"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label={t.changePhoto}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary shadow-md hover:bg-accent-soft transition disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
          <div className="min-w-0 text-white">
            <h1 className="text-xl font-bold truncate">
              {user.name ?? "Foydalanuvchi"}
            </h1>
            <p className="text-white/80 text-sm">
              {formatPhoneDisplay(user.phone)}
            </p>
            {uploading && (
              <p className="mt-1 text-xs text-white/90">{t.photoUploading}</p>
            )}
            {uploadError && (
              <p className="mt-1 text-xs text-red-200">{uploadError}</p>
            )}
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${roleInfo.headerClass}`}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {roleInfo.label}
            </span>
            {user.isVerified === false ? (
              <span className="mt-2 ml-2 inline-flex items-center rounded-full bg-error px-3 py-1 text-xs font-bold text-white">
                {t.blocked}
              </span>
            ) : (
              <span className="mt-2 ml-2 inline-flex items-center rounded-full bg-success px-3 py-1 text-xs font-bold text-white">
                {t.accountActive}
              </span>
            )}
          </div>
        </PageContainer>
      </div>

      <PageContainer className="-mt-6 space-y-4">
        {(isProfessional || user.isVerified === false) && (
          <AccountStatusBanner
            blocked={user.isVerified === false}
            blockedTitle={t.accountBlocked}
            blockedDesc={t.accountBlockedDesc}
            activeTitle={t.accountActive}
            activeDesc={t.accountActiveDesc}
            showActive={isProfessional}
          />
        )}

        <Card className="shadow-md">
          <CardBody>
            <h2 className="font-bold text-primary mb-3">{t.role}</h2>
            <div className="flex items-center gap-3 rounded-xl bg-accent-soft/60 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-accent">
                <RoleIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">
                    {roleInfo.label}
                  </p>
                  <Badge variant={roleInfo.badgeVariant}>{roleInfo.label}</Badge>
                </div>
                {roleInfo.desc && (
                  <p className="text-sm text-muted mt-0.5">{roleInfo.desc}</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {isCustomer && (
          <Card className="shadow-md">
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#229ED9]/15">
                  <Send className="h-5 w-5 text-[#229ED9]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary">{t.telegramBot}</p>
                  <p className="text-sm text-muted">{t.telegramConnectDescCustomer}</p>
                </div>
                {telegramConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : null}
              </div>
              {telegramConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 px-4 py-3">
                    <p className="text-sm font-medium text-success">
                      {t.telegramConnected}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={telegramLoading}
                      onClick={async () => {
                        if (!accessToken) return;
                        setTelegramLoading(true);
                        try {
                          await api.disconnectCustomerTelegram(accessToken);
                          setTelegramConnected(false);
                        } finally {
                          setTelegramLoading(false);
                        }
                      }}
                    >
                      {t.telegramDisconnect}
                    </Button>
                  </div>
                  <p className="text-xs text-muted rounded-xl bg-accent-soft/50 px-3 py-2.5 leading-relaxed">
                    {t.telegramStatusHintCustomer}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {telegramLink ? (
                    <p className="text-sm text-muted flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.telegramWaiting}
                    </p>
                  ) : null}
                  <Button
                    className="w-full"
                    disabled={telegramLoading}
                    onClick={async () => {
                      if (!accessToken) return;
                      setTelegramLoading(true);
                      try {
                        const res = await api.createCustomerTelegramLink(accessToken);
                        if (res.connected) {
                          setTelegramConnected(true);
                          setTelegramLink(null);
                        } else if (res.link) {
                          setTelegramLink(res.link);
                          window.location.href = res.link;
                        }
                      } finally {
                        setTelegramLoading(false);
                      }
                    }}
                  >
                    {telegramLink ? t.telegramWaiting : t.telegramConnect}
                  </Button>
                  {telegramLink && (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-sm text-accent hover:underline"
                    >
                      {t.telegramReopenLink}
                    </a>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        <Card className="shadow-md">
          <CardBody className="space-y-1">
            <h2 className="font-bold text-primary mb-3">{t.settings}</h2>

            <Link
              href="/profile/settings"
              className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition border-b border-border"
            >
              <span className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                {t.accountSettings}
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-muted" />
                {t.language}
              </div>
              <LanguageSelect onChange={changeLanguage} />
            </div>

            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition border-b border-border"
              >
                <span className="flex items-center gap-3">
                  <Shield className="h-4 w-4" />
                  {t.adminPanel}
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            ) : user.role === "professional" ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition border-b border-border"
                >
                  <span className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.dashboard}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
                <Link
                  href="/reviews"
                  className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition border-b border-border"
                >
                  <span className="flex items-center gap-3">
                    <Star className="h-4 w-4" />
                    {t.myReviews}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </>
            ) : (
              <Link
                href="/orders"
                className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition border-b border-border"
              >
                <span className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4" />
                  {t.ordersNav}
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            )}

            <Link
              href="/profile/suggestion"
              className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition border-b border-border"
            >
              <span className="flex items-center gap-3">
                <MessageSquarePlus className="h-4 w-4" />
                {t.suggestion}
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>

            <Link
              href="/faq"
              className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-primary hover:text-accent transition"
            >
              <span className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4" />
                {t.helpFaq}
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </CardBody>
        </Card>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut className="h-4 w-4" />
          {t.logout}
        </Button>
      </PageContainer>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4">
              <h2
                id="logout-confirm-title"
                className="font-bold text-primary text-lg"
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
