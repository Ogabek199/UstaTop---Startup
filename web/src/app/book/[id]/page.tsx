"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { SchedulePicker, buildScheduledAt, isTimeInPast } from "@/components/schedule-picker";
import { useI18n } from "@/i18n/provider";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getProfessional, getServices } from "@/lib/data";
import { api, type MasterProfile, type Service } from "@/lib/api";
import { formatDateFull } from "@/lib/date";
import { formatPrice, cn } from "@/lib/utils";
import { serviceName } from "@/i18n";
import { PageLoader, Spinner } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { EmptyState } from "@/components/empty-state";

const EXPRESS_FEE = 15000;

type FieldErrors = {
  serviceId?: string;
  description?: string;
  date?: string;
  time?: string;
  address?: string;
};

export default function BookPage() {
  const { id: masterId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const priceMin = Number(searchParams.get("priceMin") ?? 150000);
  const router = useRouter();
  const { t, locale } = useI18n();
  const { accessToken, isReady, isAuthenticated } = useRequireAuth();

  const [step, setStep] = useState(1);
  const [pro, setPro] = useState<MasterProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [isExpress, setIsExpress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isReady || !accessToken) return;
    Promise.all([getProfessional(masterId), getServices()]).then(
      ([p, s]) => {
        if (p) {
          setPro(p);
          if (p.serviceCategoryIds[0]) setServiceId(p.serviceCategoryIds[0]);
        }
        setServices(s);
      },
    );
  }, [masterId, accessToken, isReady]);

  const basePrice = Math.max(
    priceMin || 0,
    Number(pro?.priceMin ?? 0) || 0,
  );
  const total = basePrice + (isExpress ? EXPRESS_FEE : 0);

  const validateStep1 = (): boolean => {
    const errors: FieldErrors = {};
    if (!serviceId) {
      errors.serviceId = t.proServiceRequired;
    }
    const desc = description.trim();
    if (!desc) {
      errors.description = t.descriptionRequired;
    } else if (desc.length < 10) {
      errors.description = t.descriptionMinLength;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTime = (errors: FieldErrors) => {
    if (!selectedTime) {
      errors.time = t.timeRequired;
    } else if (isTimeInPast(selectedTime, selectedDate)) {
      errors.time = t.timeInvalid;
    }
  };

  const validateStep2 = (): boolean => {
    const errors: FieldErrors = {};
    if (!selectedDate) {
      errors.date = t.dateRequired;
    }
    validateTime(errors);
    if (!address.trim()) {
      errors.address = t.addressRequired;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAll = (): boolean => {
    const errors: FieldErrors = {};
    if (!serviceId) {
      errors.serviceId = t.proServiceRequired;
    }
    const desc = description.trim();
    if (!desc) {
      errors.description = t.descriptionRequired;
    } else if (desc.length < 10) {
      errors.description = t.descriptionMinLength;
    }
    if (!selectedDate) {
      errors.date = t.dateRequired;
    }
    validateTime(errors);
    if (!address.trim()) {
      errors.address = t.addressRequired;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    setFieldErrors({});
    setStep(2);
  };

  const goToStep3 = () => {
    if (!validateStep2()) return;
    setFieldErrors({});
    setStep(3);
  };

  if (!isReady || !isAuthenticated) return null;

  if (!pro) return <PageLoader label={t.loading} className="min-h-screen" />;

  if (pro.user.isVerified === false) {
    return (
      <div className="min-h-screen pb-nav">
        <PageContainer className="py-5 space-y-4">
          <Link
            href={`/professionals/${masterId}`}
            className="inline-flex items-center gap-2 text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            {t.back}
          </Link>
          <Card className="border-error/25">
            <CardBody className="flex items-start gap-3 py-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                <Ban className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-error">{t.professionalBlocked}</p>
                <p className="mt-1 text-sm text-error/80">
                  {t.professionalBlockedDesc}
                </p>
              </div>
            </CardBody>
          </Card>
          <EmptyState
            icon="users"
            title={t.bookingUnavailable}
            action={{ label: t.findPro, href: "/" }}
            variant="card"
          />
        </PageContainer>
      </div>
    );
  }

  const steps = [t.serviceDetails, t.dateAddress, t.confirm];

  const submit = async () => {
    if (!accessToken || !pro || !validateAll()) return;
    if (pro.user.isVerified === false) {
      setError(t.professionalBlocked);
      return;
    }
    if (!serviceId || !selectedDate || !selectedTime) return;
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const scheduledAt = buildScheduledAt(selectedDate, selectedTime);
      const order = await api.createOrder(accessToken, {
        serviceId,
        masterId: pro.userId,
        description: description.trim(),
        address: address.trim(),
        scheduledAt,
        price: basePrice,
        isExpress,
      });
      await api.createPayment(accessToken, order.id, "payme");
      router.push(`/orders/${order.id}?paid=1`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.error;
      setError(
        msg === "Professional not available" ? t.professionalBlocked : msg,
      );
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const scheduleLabel =
    selectedDate && selectedTime
      ? `${formatDateFull(selectedDate, locale)}, ${format(new Date(`2000-01-01T${selectedTime}`), "HH:mm")}`
      : "—";

  return (
    <div className="min-h-screen pb-nav">
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Link href={`/professionals/${masterId}`}>
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Link>
          <h1 className="font-bold text-primary">{t.bookNow}</h1>
        </div>
        <div className="mx-auto flex max-w-lg px-5 pb-4 gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  "h-1 rounded-full mb-1",
                  step > i ? "bg-accent" : "bg-border",
                )}
              />
              <p
                className={cn(
                  "text-[10px] font-medium truncate",
                  step === i + 1 ? "text-accent" : "text-muted",
                )}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="text-sm font-medium text-muted mb-1.5 block">
                {t.serviceType} <span className="text-error">*</span>
              </label>
              <select
                className={cn(
                  "w-full h-12 rounded-xl border px-4 bg-white",
                  fieldErrors.serviceId ? "border-error" : "border-border",
                )}
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  if (fieldErrors.serviceId) {
                    setFieldErrors((prev) => ({ ...prev, serviceId: undefined }));
                  }
                }}
              >
                {services
                  .filter((s) => pro.serviceCategoryIds.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {serviceName(s, locale)}
                    </option>
                  ))}
              </select>
              {fieldErrors.serviceId && (
                <p className="mt-1 text-xs text-error">{fieldErrors.serviceId}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted mb-1.5 block">
                {t.problemDesc} <span className="text-error">*</span>
              </label>
              <textarea
                className={cn(
                  "w-full min-h-28 rounded-xl border p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20",
                  fieldErrors.description ? "border-error" : "border-border",
                )}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      description: undefined,
                    }));
                  }
                }}
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-error">{fieldErrors.description}</p>
              )}
            </div>
            <Button size="lg" className="w-full" onClick={goToStep2}>
              {t.continue}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <SchedulePicker
              date={selectedDate}
              time={selectedTime}
              onDateChange={(date) => {
                setSelectedDate(date);
                if (fieldErrors.date) {
                  setFieldErrors((prev) => ({ ...prev, date: undefined }));
                }
              }}
              onTimeChange={(time) => {
                setSelectedTime(time);
                if (fieldErrors.time) {
                  setFieldErrors((prev) => ({ ...prev, time: undefined }));
                }
              }}
              locale={locale}
              labels={{
                date: t.date,
                time: t.time,
                customTime: t.customTime,
                customTimeHint: t.customTimeHint,
                hour: t.hourLabel,
                minute: t.minuteLabel,
              }}
              errors={{
                date: fieldErrors.date,
                time: fieldErrors.time,
              }}
            />
            <div>
              <label className="text-sm font-medium text-muted mb-1.5 block">
                {t.address} <span className="text-error">*</span>
              </label>
              <Input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors.address) {
                    setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }
                }}
                placeholder="Ko'cha, uy raqami"
                className={fieldErrors.address ? "border-error focus:border-error" : ""}
              />
              {fieldErrors.address && (
                <p className="mt-1 text-xs text-error">{fieldErrors.address}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setFieldErrors({});
                  setStep(1);
                }}
              >
                {t.back}
              </Button>
              <Button size="lg" className="flex-1" onClick={goToStep3}>
                {t.continue}
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Card>
              <CardBody className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Usta</span>
                  <span className="font-semibold">{pro.user.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t.address}</span>
                  <span className="font-semibold text-right max-w-[60%]">
                    {address.trim() || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t.date}</span>
                  <span className="font-semibold text-right max-w-[60%]">
                    {scheduleLabel}
                  </span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-border">
                  <input
                    type="checkbox"
                    checked={isExpress}
                    onChange={(e) => setIsExpress(e.target.checked)}
                    className="h-5 w-5 rounded accent-accent"
                  />
                  <div>
                    <p className="font-semibold text-sm">{t.expressOrder}</p>
                    <p className="text-xs text-muted">+{formatPrice(EXPRESS_FEE)} so&apos;m</p>
                  </div>
                </label>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-bold">{t.total}</span>
                  <span className="font-bold text-primary text-lg">
                    {formatPrice(total, locale)} so&apos;m
                  </span>
                </div>
              </CardBody>
            </Card>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                {t.back}
              </Button>
              <Button size="lg" className="flex-1" onClick={submit} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" light />
                    {t.loading}
                  </>
                ) : (
                  t.pay
                )}
              </Button>
            </div>
          </>
        )}
        {error && <p className="text-sm text-error text-center">{error}</p>}
      </main>
    </div>
  );
}
