"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Wrench,
  BadgeCheck,
  ClipboardList,
  CheckCircle2,
  Wallet,
  Percent,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Ban,
} from "lucide-react";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useI18n } from "@/i18n/provider";
import { api, type AdminStats } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Spinner } from "@/components/loading";
import { cn, formatPrice } from "@/lib/utils";

export default function AdminStatsPage() {
  const { accessToken, isAdmin } = useRequireAdmin();
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminStats(accessToken);
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.error]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Spinner size="lg" />
        <p className="text-sm text-muted">{t.loading}</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-error/20">
        <CardBody className="space-y-3 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error">
            <Ban className="h-5 w-5" />
          </span>
          <p className="font-medium text-error">{error || t.error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-semibold text-accent hover:underline"
          >
            {t.retry}
          </button>
        </CardBody>
      </Card>
    );
  }

  const completionRate =
    stats.totalOrders > 0
      ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
      : 0;

  const approvalRate =
    stats.totalProfessionals > 0
      ? Math.round(
          (stats.activeProfessionals / stats.totalProfessionals) * 100,
        )
      : 0;

  const cards = [
    {
      label: t.totalUsers,
      value: String(stats.totalUsers),
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: t.totalProfessionals,
      value: String(stats.totalProfessionals),
      icon: Wrench,
      tone: "accent" as const,
    },
    {
      label: t.activeProfessionals,
      value: String(stats.activeProfessionals),
      icon: BadgeCheck,
      tone: "success" as const,
    },
    {
      label: t.totalOrders,
      value: String(stats.totalOrders),
      icon: ClipboardList,
      tone: "accent" as const,
    },
    {
      label: t.completedOrdersStat,
      value: String(stats.completedOrders),
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: t.totalRevenue,
      value: `${formatPrice(stats.totalRevenue, locale)} so'm`,
      icon: Wallet,
      tone: "warning" as const,
    },
    {
      label: t.totalCommission,
      value: `${formatPrice(stats.totalCommission, locale)} so'm`,
      icon: Percent,
      tone: "primary" as const,
    },
  ];

  const toneStyles = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

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
              {t.adminStats}
            </h1>
            <p className="mt-1 text-sm text-muted">{t.adminPanel}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted">{t.totalOrders}</p>
              <p className="text-lg font-bold leading-tight tabular-nums text-primary">
                {stats.totalOrders}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40" />
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="overflow-hidden border-accent/20">
          <CardBody className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-primary">
                  {t.completedOrdersStat}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-success">
                {completionRate}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-success to-accent transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              {stats.completedOrders} / {stats.totalOrders} {t.ordersNav.toLowerCase()}
            </p>
          </CardBody>
        </Card>

        <Card className="overflow-hidden border-accent/20">
          <CardBody className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-primary">
                  {t.activeProfessionals}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-accent">
                {approvalRate}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-700"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              {stats.activeProfessionals} / {stats.totalProfessionals}{" "}
              {t.filterProfessionals.toLowerCase()}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tone }, index) => (
          <Card
            key={label}
            className={cn(
              "animate-fade-in-up overflow-hidden transition-all duration-200 hover:border-accent/30 hover:shadow-md",
            )}
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <CardBody className="flex items-start gap-3.5 p-4 sm:p-5">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  toneStyles[tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{label}</p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-primary">
                  {value}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
