"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Phone } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useI18n } from "@/i18n/provider";
import type { Dictionary } from "@/i18n";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PageContainer } from "@/components/page-container";
import {
  formatPhoneDisplayInput,
  formatPhoneInput,
  isValidPhone,
} from "@/lib/phone";

const STRONG_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function localizeSecurityError(message: string, t: Dictionary): string {
  const map: Record<string, string> = {
    "Current password is incorrect": t.wrongCurrentPassword,
    "Phone number already in use": t.phoneInUse,
    "Phone number is already set": t.phoneSame,
    "New password must be different from current password": t.newPasswordSame,
    "Password must be at least 8 characters": t.passwordMinLength,
    "Password must contain at least one letter and one number": t.passwordStrength,
  };
  return map[message] ?? message;
}

export default function ProfileSettingsPage() {
  const { user, accessToken, setUser } = useAuth();
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();
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

  if (!isReady || !isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen pb-nav bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <PageContainer className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="text-primary"
            aria-label={t.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-primary">{t.settings}</h1>
        </PageContainer>
      </div>

      <PageContainer className="space-y-4 py-4">
        <Card className="shadow-md">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-accent" />
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
            {phoneError && <p className="text-sm text-error">{phoneError}</p>}
            {phoneSuccess && (
              <p className="text-sm text-success">{phoneSuccess}</p>
            )}
            <Button
              className="w-full"
              disabled={phoneLoading}
              onClick={handleChangePhone}
            >
              {phoneLoading ? t.loading : t.saveChanges}
            </Button>
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" />
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
              <p className="text-sm text-error">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-success">{passwordSuccess}</p>
            )}
            <Button
              className="w-full"
              disabled={passwordLoading}
              onClick={handleChangePassword}
            >
              {passwordLoading ? t.loading : t.saveChanges}
            </Button>
          </CardBody>
        </Card>
      </PageContainer>
    </div>
  );
}
