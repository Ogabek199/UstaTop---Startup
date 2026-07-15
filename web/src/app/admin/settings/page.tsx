"use client";

import { useState } from "react";
import {
  Lock,
  Phone,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useI18n } from "@/i18n/provider";
import type { Dictionary } from "@/i18n";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/loading";
import {
  formatPhoneDisplay,
  formatPhoneDisplayInput,
  formatPhoneInput,
  isValidPhone,
} from "@/lib/phone";

const STRONG_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function localizeSecurityError(
  message: string,
  t: Dictionary,
): string {
  const map: Record<string, string> = {
    "Current password is incorrect": t.wrongCurrentPassword,
    "Phone number already in use": t.phoneInUse,
    "Phone number is already set": t.phoneSame,
    "New password must be different from current password": t.newPasswordSame,
    "Password must be at least 8 characters": t.passwordMinLength,
    "Password must contain at least one letter and one number":
      t.passwordStrength,
  };
  return map[message] ?? message;
}

export default function AdminSettingsPage() {
  const { user, accessToken, setUser } = useAuth();
  const { isReady, isAdmin } = useRequireAdmin();
  const { t } = useI18n();

  const [newPhone, setNewPhone] = useState("+998");
  const [phonePassword, setPhonePassword] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
  const [phoneFieldErrors, setPhoneFieldErrors] = useState<{
    newPhone?: string;
    currentPassword?: string;
  }>({});

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleChangePhone = async () => {
    if (!accessToken || !user) return;

    const errors: { newPhone?: string; currentPassword?: string } = {};
    if (!newPhone || newPhone === "+998") {
      errors.newPhone = t.phoneRequired;
    } else if (!isValidPhone(newPhone)) {
      errors.newPhone = t.phoneInvalid;
    } else if (newPhone === user.phone) {
      errors.newPhone = t.phoneSame;
    }
    if (!phonePassword) {
      errors.currentPassword = t.passwordRequired;
    }
    setPhoneFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPhoneLoading(true);
    setPhoneError("");
    setPhoneSuccess("");
    try {
      const updated = await api.changePhone(accessToken, {
        newPhone,
        currentPassword: phonePassword,
      });
      setUser(updated);
      setPhonePassword("");
      setNewPhone("+998");
      setPhoneSuccess(t.phoneChanged);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.error;
      setPhoneError(localizeSecurityError(msg, t));
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!accessToken) return;

    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};
    if (!currentPassword) {
      errors.currentPassword = t.passwordRequired;
    }
    if (!newPassword || newPassword.length < 8) {
      errors.newPassword = t.passwordMinLength;
    } else if (!STRONG_PASSWORD.test(newPassword)) {
      errors.newPassword = t.passwordStrength;
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = t.newPasswordSame;
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t.passwordMismatch;
    }
    setPasswordFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await api.changePassword(accessToken, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(t.passwordChanged);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.error;
      setPasswordError(localizeSecurityError(msg, t));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isReady || !isAdmin || !user) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 0% 0%, var(--accent-soft) 0%, transparent 55%), radial-gradient(ellipse 60% 80% at 100% 100%, #eef6f4 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.adminPanel}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {t.settings}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {formatPhoneDisplay(user.phone)}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted">{t.roleAdmin}</p>
              <p className="truncate text-sm font-bold text-primary">
                {user.name?.trim() || "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardBody className="space-y-3.5 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Phone className="h-4 w-4" />
              </span>
              <h2 className="font-bold text-primary">{t.changePhone}</h2>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                {t.newPhone}
              </label>
              <Input
                value={formatPhoneDisplayInput(newPhone)}
                onChange={(e) => {
                  setNewPhone(formatPhoneInput(e.target.value));
                  setPhoneSuccess("");
                  if (phoneFieldErrors.newPhone) {
                    setPhoneFieldErrors((err) => ({
                      ...err,
                      newPhone: undefined,
                    }));
                  }
                }}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
                autoComplete="tel"
                className={
                  phoneFieldErrors.newPhone
                    ? "border-error focus:border-error"
                    : ""
                }
              />
              {phoneFieldErrors.newPhone && (
                <p className="mt-1 text-xs text-error">
                  {phoneFieldErrors.newPhone}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                {t.currentPassword}
              </label>
              <PasswordInput
                value={phonePassword}
                onChange={(e) => {
                  setPhonePassword(e.target.value);
                  setPhoneSuccess("");
                  if (phoneFieldErrors.currentPassword) {
                    setPhoneFieldErrors((err) => ({
                      ...err,
                      currentPassword: undefined,
                    }));
                  }
                }}
                autoComplete="current-password"
                className={
                  phoneFieldErrors.currentPassword
                    ? "border-error focus:border-error"
                    : ""
                }
              />
              {phoneFieldErrors.currentPassword && (
                <p className="mt-1 text-xs text-error">
                  {phoneFieldErrors.currentPassword}
                </p>
              )}
            </div>

            {phoneError && (
              <div className="flex items-start gap-2 rounded-xl bg-error/5 px-3 py-2 text-sm text-error">
                <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                {phoneError}
              </div>
            )}
            {phoneSuccess && (
              <p className="text-sm font-medium text-success">{phoneSuccess}</p>
            )}

            <Button
              className="w-full"
              disabled={phoneLoading}
              onClick={() => void handleChangePhone()}
            >
              {phoneLoading ? t.loading : t.saveChanges}
            </Button>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="space-y-3.5 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-4 w-4" />
              </span>
              <h2 className="font-bold text-primary">{t.changePassword}</h2>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                {t.currentPassword}
              </label>
              <PasswordInput
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordSuccess("");
                  if (passwordFieldErrors.currentPassword) {
                    setPasswordFieldErrors((err) => ({
                      ...err,
                      currentPassword: undefined,
                    }));
                  }
                }}
                autoComplete="current-password"
                className={
                  passwordFieldErrors.currentPassword
                    ? "border-error focus:border-error"
                    : ""
                }
              />
              {passwordFieldErrors.currentPassword && (
                <p className="mt-1 text-xs text-error">
                  {passwordFieldErrors.currentPassword}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                {t.newPassword}
              </label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordSuccess("");
                  if (passwordFieldErrors.newPassword) {
                    setPasswordFieldErrors((err) => ({
                      ...err,
                      newPassword: undefined,
                    }));
                  }
                }}
                autoComplete="new-password"
                placeholder={t.passwordHint}
                className={
                  passwordFieldErrors.newPassword
                    ? "border-error focus:border-error"
                    : ""
                }
              />
              {passwordFieldErrors.newPassword && (
                <p className="mt-1 text-xs text-error">
                  {passwordFieldErrors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                {t.confirmNewPassword}
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordSuccess("");
                  if (passwordFieldErrors.confirmPassword) {
                    setPasswordFieldErrors((err) => ({
                      ...err,
                      confirmPassword: undefined,
                    }));
                  }
                }}
                autoComplete="new-password"
                className={
                  passwordFieldErrors.confirmPassword
                    ? "border-error focus:border-error"
                    : ""
                }
              />
              {passwordFieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-error">
                  {passwordFieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 rounded-xl bg-error/5 px-3 py-2 text-sm text-error">
                <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <p className="text-sm font-medium text-success">
                {passwordSuccess}
              </p>
            )}

            <Button
              className="w-full"
              disabled={passwordLoading}
              onClick={() => void handleChangePassword()}
            >
              {passwordLoading ? t.loading : t.saveChanges}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
