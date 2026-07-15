"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Card, CardBody } from "@/components/ui/card";
import { LanguageSelect } from "@/components/language-select";
import { useI18n } from "@/i18n/provider";
import { serviceName } from "@/i18n";
import type { Dictionary } from "@/i18n";
import { useAuth } from "@/store/auth";
import { api, type Service } from "@/lib/api";
import { getServices } from "@/lib/data";
import { MOCK_DISTRICTS } from "@/lib/mock-data";
import {
  formatPhoneDisplayInput,
  formatPhoneInput,
  isValidPhone,
} from "@/lib/phone";
import { cn, formatPrice, formatPriceInput, parsePriceInput } from "@/lib/utils";

type Role = "customer" | "professional";
type Mode = "login" | "register";

type LoginFields = { phone: string; password: string };
type CustomerRegisterFields = {
  phone: string;
  name: string;
  password: string;
  passwordConfirm: string;
};
type ProfessionalRegisterFields = CustomerRegisterFields & {
  district: string;
  serviceIds: string[];
  customServices: string[];
  priceMin: string;
  bio: string;
};

type FieldErrors = {
  phone?: string;
  name?: string;
  password?: string;
  passwordConfirm?: string;
  district?: string;
  serviceIds?: string;
  priceMin?: string;
};

const emptyLogin = (): LoginFields => ({ phone: "+998", password: "" });
const emptyCustomerRegister = (): CustomerRegisterFields => ({
  phone: "+998",
  name: "",
  password: "",
  passwordConfirm: "",
});
const emptyProfessionalRegister = (): ProfessionalRegisterFields => ({
  ...emptyCustomerRegister(),
  district: "",
  serviceIds: [],
  customServices: [],
  priceMin: "",
  bio: "",
});

function localizeApiError(message: string, t: Dictionary): string {
  const map: Record<string, string> = {
    "Invalid phone or password": t.invalidCredentials,
    "Account already exists. Please login with your password.": t.accountExists,
    "Password must be at least 8 characters": t.passwordMinLength,
    "Password must contain at least one letter and one number": t.passwordStrength,
    CUSTOMER_ACCOUNT: t.loginAsCustomer,
    PROFESSIONAL_ACCOUNT: t.loginAsProfessional,
  };
  return map[message] ?? message;
}

export default function LoginPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const accessToken = useAuth((s) => s.accessToken);
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("customer");
  const [loginForms, setLoginForms] = useState({
    customer: emptyLogin(),
    professional: emptyLogin(),
  });
  const [registerForms, setRegisterForms] = useState({
    customer: emptyCustomerRegister(),
    professional: emptyProfessionalRegister(),
  });
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [customServiceInput, setCustomServiceInput] = useState("");

  const loginForm = loginForms[role];
  const customerRegisterForm = registerForms.customer;
  const professionalRegisterForm = registerForms.professional;
  const registerForm =
    role === "customer" ? customerRegisterForm : professionalRegisterForm;

  const defaultPathForRole = (userRole: string) => {
    if (userRole === "admin") return "/admin";
    if (userRole === "professional") return "/dashboard";
    return "/";
  };

  const redirectAfterAuth = (userRole: string) => {
    router.replace(defaultPathForRole(userRole));
  };

  useEffect(() => {
    if (!hydrated || !accessToken || !user) return;
    router.replace(defaultPathForRole(user.role));
  }, [hydrated, accessToken, user, router]);

  const updateLoginForm = (r: Role, patch: Partial<LoginFields>) => {
    setLoginForms((prev) => ({
      ...prev,
      [r]: { ...prev[r], ...patch },
    }));
  };

  const updateRegisterForm = (
    r: Role,
    patch: Partial<CustomerRegisterFields & ProfessionalRegisterFields>,
  ) => {
    setRegisterForms((prev) => ({
      ...prev,
      [r]: { ...prev[r], ...patch },
    }));
  };

  useEffect(() => {
    getServices().then(setServices);
  }, []);

  const validatePhone = (phone: string): boolean => {
    if (!phone || phone === "+998") {
      setFieldErrors({ phone: t.phoneRequired });
      return false;
    }
    if (!isValidPhone(phone)) {
      setFieldErrors({ phone: t.phoneInvalid });
      return false;
    }
    return true;
  };

  const isStrongPassword = (password: string): boolean =>
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);

  const validateRegisterPassword = (
    password: string,
  ): string | undefined => {
    if (!password || password.length < 8) {
      return t.passwordMinLength;
    }
    if (!isStrongPassword(password)) {
      return t.passwordStrength;
    }
    return undefined;
  };

  const validateLoginPassword = (password: string): boolean => {
    if (!password) {
      setFieldErrors({ password: t.passwordRequired });
      return false;
    }
    return true;
  };

  const validateCustomerRegister = (form: CustomerRegisterFields): boolean => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) {
      errors.name = t.nameRequired;
    } else if (form.name.trim().length < 2) {
      errors.name = t.nameMinLength;
    }
    const passwordError = validateRegisterPassword(form.password);
    if (passwordError) {
      errors.password = passwordError;
    }
    if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = t.passwordMismatch;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateProfessionalRegister = (
    form: ProfessionalRegisterFields,
  ): boolean => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) {
      errors.name = t.nameRequired;
    } else if (form.name.trim().length < 2) {
      errors.name = t.nameMinLength;
    }
    const passwordError = validateRegisterPassword(form.password);
    if (passwordError) {
      errors.password = passwordError;
    }
    if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = t.passwordMismatch;
    }
    if (!form.district) {
      errors.district = t.proDistrictRequired;
    }
    if (form.serviceIds.length === 0 && form.customServices.length === 0) {
      errors.serviceIds = t.proServicesRequired;
    }
    const price = Number(form.priceMin);
    if (!form.priceMin || Number.isNaN(price) || price <= 0) {
      errors.priceMin = t.proPriceRequired;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRoleChange = (r: Role) => {
    setRole(r);
    setCustomServiceInput("");
    setFieldErrors({});
    setError("");
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setCustomServiceInput("");
    setFieldErrors({});
    setError("");
  };

  const addCustomService = () => {
    const name = customServiceInput.trim();
    if (!name) return;
    const current = professionalRegisterForm.customServices;
    if (current.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setCustomServiceInput("");
      return;
    }
    updateRegisterForm("professional", {
      customServices: [...current, name],
    });
    setCustomServiceInput("");
    if (fieldErrors.serviceIds) {
      setFieldErrors((err) => ({ ...err, serviceIds: undefined }));
    }
  };

  const removeCustomService = (name: string) => {
    updateRegisterForm("professional", {
      customServices: professionalRegisterForm.customServices.filter(
        (s) => s !== name,
      ),
    });
  };

  const toggleProfessionalService = (serviceId: string) => {
    const current = professionalRegisterForm.serviceIds;
    const next = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId];
    updateRegisterForm("professional", { serviceIds: next });
    if (fieldErrors.serviceIds) {
      setFieldErrors((err) => ({ ...err, serviceIds: undefined }));
    }
  };

  const showError = (msg: string) => setError(localizeApiError(msg, t));

  const handleLogin = async () => {
    const form = loginForms[role];
    if (!validatePhone(form.phone)) return;
    if (!validateLoginPassword(form.password)) return;

    setLoading(true);
    setError("");
    try {
      const res = await api.login(form.phone, form.password, role);
      if (res.user.role !== role && res.user.role !== "admin") {
        showError(
          res.user.role === "customer" ? "CUSTOMER_ACCOUNT" : "PROFESSIONAL_ACCOUNT",
        );
        return;
      }
      setAuth(res.user, res.accessToken, res.refreshToken);
      redirectAfterAuth(res.user.role);
    } catch (e) {
      showError(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const form = registerForms[role];
    if (!validatePhone(form.phone)) return;
    const valid =
      role === "customer"
        ? validateCustomerRegister(form as CustomerRegisterFields)
        : validateProfessionalRegister(form as ProfessionalRegisterFields);
    if (!valid) return;

    setLoading(true);
    setError("");
    try {
      const check = await api.checkPhone(form.phone);
      if (check.hasPassword) {
        setError(t.accountExists);
        return;
      }
      if (check.exists && check.role && check.role !== role) {
        showError(
          check.role === "customer" ? "CUSTOMER_ACCOUNT" : "PROFESSIONAL_ACCOUNT",
        );
        return;
      }

      const proForm =
        role === "professional"
          ? (form as ProfessionalRegisterFields)
          : null;

      const res = await api.register({
        phone: form.phone,
        password: form.password,
        role,
        name: form.name.trim(),
        ...(proForm
          ? {
            district: proForm.district,
            serviceCategoryIds: proForm.serviceIds,
            customServiceNames: proForm.customServices,
            priceMin: Number(proForm.priceMin),
            priceMax: Number(proForm.priceMin),
            bio: proForm.bio.trim() || undefined,
          }
          : {}),
      });
      setAuth(res.user, res.accessToken, res.refreshToken);
      redirectAfterAuth(res.user.role);
    } catch (e) {
      showError(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-accent-soft to-background">
      <header className="flex w-full items-center justify-between bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/logo.png"
            alt="UstaTop"
            width={48}
            height={48}
            priority
            className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-border/60"
          />
          <p className="truncate text-lg font-bold tracking-tight text-primary">
            {t.appName}
          </p>
        </div>
        <LanguageSelect />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">{t.appName}</h1>
          <p className="text-muted">{t.tagline}</p>
        </div>

        <Card className="w-full max-w-md shadow-lg">
          <CardBody className="space-y-4 p-6">
            <div className="flex gap-2 rounded-xl bg-accent-soft/40 p-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-semibold transition",
                    mode === m
                      ? "bg-white text-accent shadow-sm"
                      : "text-muted",
                  )}
                >
                  {m === "login" ? t.loginWithPassword : t.register}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(["customer", "professional"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition",
                    role === r
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-muted",
                  )}
                >
                  {r === "customer" ? t.iAmCustomer : t.iAmPro}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                {t.phone} <span className="text-error">*</span>
              </label>
              <Input
                key={`${mode}-${role}-phone`}
                value={formatPhoneDisplayInput(
                  mode === "login" ? loginForm.phone : registerForm.phone,
                )}
                onChange={(e) => {
                  const formatted = formatPhoneInput(e.target.value);
                  if (mode === "login") {
                    updateLoginForm(role, { phone: formatted });
                  } else {
                    updateRegisterForm(role, { phone: formatted });
                  }
                  if (fieldErrors.phone) {
                    setFieldErrors((err) => ({ ...err, phone: undefined }));
                  }
                }}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
                autoComplete="tel"
                className={fieldErrors.phone ? "border-error focus:border-error" : ""}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-error">{fieldErrors.phone}</p>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  {t.yourName} <span className="text-error">*</span>
                </label>
                <Input
                  key={`register-${role}-name`}
                  value={registerForm.name}
                  onChange={(e) => {
                    updateRegisterForm(role, { name: e.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors((err) => ({ ...err, name: undefined }));
                    }
                  }}
                  placeholder={
                    role === "customer" ? "Masalan: Dilnoza" : "Masalan: Jamshid"
                  }
                  autoComplete="name"
                  className={fieldErrors.name ? "border-error focus:border-error" : ""}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-error">{fieldErrors.name}</p>
                )}
              </div>
            )}

            {mode === "register" && role === "professional" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">
                    {t.proDistrict} <span className="text-error">*</span>
                  </label>
                  <Select
                    value={professionalRegisterForm.district}
                    onChange={(e) => {
                      updateRegisterForm("professional", { district: e.target.value });
                      if (fieldErrors.district) {
                        setFieldErrors((err) => ({ ...err, district: undefined }));
                      }
                    }}
                    className={fieldErrors.district ? "border-error" : ""}
                  >
                    <option value="">{t.proDistrictRequired}</option>
                    {MOCK_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                  {fieldErrors.district && (
                    <p className="mt-1 text-xs text-error">{fieldErrors.district}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">
                    {t.proServices} <span className="text-error">*</span>
                  </label>
                  <div
                    className={cn(
                      "rounded-xl border border-border bg-white p-3",
                      fieldErrors.serviceIds && "border-error",
                    )}
                  >
                    <div className="flex flex-wrap gap-2">
                      {services.map((s) => {
                        const selected =
                          professionalRegisterForm.serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleProfessionalService(s.id)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                              selected
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border bg-white text-muted hover:border-accent/40 hover:text-primary",
                            )}
                          >
                            {serviceName(s, locale)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted">
                        {t.proCustomService}
                      </p>
                      {professionalRegisterForm.customServices.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {professionalRegisterForm.customServices.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
                            >
                              {name}
                              <button
                                type="button"
                                onClick={() => removeCustomService(name)}
                                className="rounded-full p-0.5 hover:bg-accent/15 transition"
                                aria-label={name}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          value={customServiceInput}
                          onChange={(e) => {
                            setCustomServiceInput(e.target.value);
                            if (fieldErrors.serviceIds) {
                              setFieldErrors((err) => ({
                                ...err,
                                serviceIds: undefined,
                              }));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomService();
                            }
                          }}
                          placeholder={t.proCustomServicePlaceholder}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-12 shrink-0 px-4"
                          onClick={addCustomService}
                          disabled={!customServiceInput.trim()}
                        >
                          {t.proAddService}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {fieldErrors.serviceIds && (
                    <p className="mt-1 text-xs text-error">{fieldErrors.serviceIds}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">
                    {t.proPriceMin} <span className="text-error">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatPriceInput(
                      professionalRegisterForm.priceMin,
                      locale,
                    )}
                    onChange={(e) => {
                      updateRegisterForm("professional", {
                        priceMin: parsePriceInput(e.target.value),
                      });
                      if (fieldErrors.priceMin) {
                        setFieldErrors((err) => ({ ...err, priceMin: undefined }));
                      }
                    }}
                    placeholder={formatPrice(150000, locale)}
                    className={fieldErrors.priceMin ? "border-error focus:border-error" : ""}
                  />
                  {fieldErrors.priceMin && (
                    <p className="mt-1 text-xs text-error">{fieldErrors.priceMin}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">
                    {t.proBio}
                  </label>
                  <textarea
                    value={professionalRegisterForm.bio}
                    onChange={(e) =>
                      updateRegisterForm("professional", { bio: e.target.value })
                    }
                    placeholder="Tajribangiz haqida qisqacha"
                    className="w-full min-h-20 rounded-xl border border-border bg-white p-4 text-sm text-foreground placeholder:text-muted resize-none outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </>
            )}

            {mode === "login" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  {t.password} <span className="text-error">*</span>
                </label>
                <PasswordInput
                  key={`login-${role}-password`}
                  value={loginForm.password}
                  onChange={(e) => {
                    updateLoginForm(role, { password: e.target.value });
                    if (fieldErrors.password) {
                      setFieldErrors((err) => ({ ...err, password: undefined }));
                    }
                  }}
                autoComplete="current-password"
                placeholder="••••••••"
                className={fieldErrors.password ? "border-error focus:border-error" : ""}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-error">{fieldErrors.password}</p>
              )}
            </div>
          )}

          {mode === "register" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  {t.password} <span className="text-error">*</span>
                </label>
                <PasswordInput
                  key={`register-${role}-password`}
                  value={registerForm.password}
                  onChange={(e) => {
                    updateRegisterForm(role, { password: e.target.value });
                    if (fieldErrors.password) {
                      setFieldErrors((err) => ({ ...err, password: undefined }));
                    }
                  }}
                  autoComplete="new-password"
                  placeholder={t.passwordHint}
                    className={fieldErrors.password ? "border-error focus:border-error" : ""}
                  />
                  {fieldErrors.password && (
                    <p className="mt-1 text-xs text-error">{fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">
                    {t.passwordConfirm} <span className="text-error">*</span>
                  </label>
                  <PasswordInput
                    key={`register-${role}-password-confirm`}
                    value={registerForm.passwordConfirm}
                    onChange={(e) => {
                      updateRegisterForm(role, { passwordConfirm: e.target.value });
                      if (fieldErrors.passwordConfirm) {
                        setFieldErrors((err) => ({
                          ...err,
                          passwordConfirm: undefined,
                        }));
                      }
                    }}
                    autoComplete="new-password"
                    placeholder="Parolni qayta kiriting"
                    className={
                      fieldErrors.passwordConfirm ? "border-error focus:border-error" : ""
                    }
                  />
                  {fieldErrors.passwordConfirm && (
                    <p className="mt-1 text-xs text-error">
                      {fieldErrors.passwordConfirm}
                    </p>
                  )}
                </div>
              </>
            )}

            {mode === "login" && (
              <Button
                size="lg"
                className="w-full"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? t.loading : t.loginWithPassword}
              </Button>
            )}

            {mode === "register" && (
              <Button
                size="lg"
                className="w-full"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? t.loading : t.register}
              </Button>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-center text-sm font-medium text-error"
              >
                {error}
              </div>
            )}
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/faq" className="font-semibold text-accent hover:underline">
            {t.helpFaq}
          </Link>
        </p>
      </div>
    </div>
  );
}
