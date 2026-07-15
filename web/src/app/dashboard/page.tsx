"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Phone,
  TrendingUp,
  ClipboardList,
  Wallet,
  CalendarDays,
  HelpCircle,
  Star,
  ChevronRight,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { usePolling } from "@/hooks/use-polling";
import { useI18n } from "@/i18n/provider";
import { serviceName } from "@/i18n";
import { api, type ProAnalytics, type ProJobEntry } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSelect } from "@/components/language-select";
import { AccountStatusBanner } from "@/components/account-status-banner";
import { formatPrice } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDayLabel, formatDateTime } from "@/lib/date";
import {
  DateRangeFilter,
  dateRangeToParams,
  defaultDateRange,
  type AppliedDateRange,
} from "@/components/date-range-filter";
import { ScrollableList } from "@/components/scrollable-list";
import { MonthlyOrdersChart } from "@/components/monthly-orders-chart";
import {
  ListPagination,
  paginate,
  RECENT_JOBS_PAGE_SIZE,
} from "@/components/list-pagination";
import type { DateRange } from "react-day-picker";

function JobRow({
  job,
  locale,
  t,
  showBadge,
}: {
  job: ProJobEntry;
  locale: string;
  t: { status: Record<string, string> };
  showBadge?: boolean;
}) {
  return (
    <Link href={`/orders/${job.id}`} className="block">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-white p-4 hover:shadow-md transition">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary truncate">
            {job.service ? serviceName(job.service, locale as "uz" | "ru") : "—"}
          </p>
          <p className="text-sm text-muted mt-0.5">{job.clientName ?? "—"}</p>
          {job.clientPhone && (
            <p className="text-xs text-muted mt-1 flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{formatPhoneDisplay(job.clientPhone)}</span>
            </p>
          )}
          {job.address && (
            <p className="text-xs text-muted mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.address}</span>
            </p>
          )}
          <p className="text-xs text-muted mt-1">
            {formatDateTime(job.date, locale as "uz" | "ru")}
          </p>
        </div>
        <div className="text-right shrink-0">
          {showBadge && (
            <Badge variant="warning" className="mb-1">
              {t.status.pending}
            </Badge>
          )}
          <p className="font-bold text-primary">
            {formatPrice(job.price, locale)} so&apos;m
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { accessToken, user, setUser } = useAuth();
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [appliedRange, setAppliedRange] = useState<AppliedDateRange>(defaultDateRange);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<ProAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(1);
  const [telegramConnected, setTelegramConnected] = useState<boolean | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const refreshAccountStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const me = await api.getMe(accessToken);
      setUser(me);
    } catch {
      // ignore
    }
  }, [accessToken, setUser]);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    const params = dateRangeToParams(appliedRange);
    api
      .getProAnalytics(accessToken, params)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [accessToken, appliedRange]);

  const refreshData = useCallback(async () => {
    if (!accessToken) return;
    const params = dateRangeToParams(appliedRange);
    try {
      const next = await api.getProAnalytics(accessToken, params);
      setData(next);
    } catch {
      // ignore polling errors
    }
  }, [accessToken, appliedRange]);

  const applyFilter = () => {
    if (!draftRange?.from || !draftRange?.to) return;
    const from = new Date(draftRange.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(draftRange.to);
    to.setHours(23, 59, 59, 999);
    setAppliedRange({ from, to });
  };

  useEffect(() => {
    if (!isReady || !accessToken) return;
    void refreshAccountStatus();
  }, [isReady, accessToken, refreshAccountStatus]);

  usePolling(refreshAccountStatus, !!accessToken && isAuthenticated, 15000);

  useEffect(() => {
    if (!isReady || !accessToken) return;
    if (user?.role !== "professional") {
      router.replace("/");
      return;
    }
    setRecentPage(1);
    load();
    api.getTelegramStatus(accessToken)
      .then((s) => {
        setTelegramConnected(s.connected);
        if (!s.connected && s.link) setTelegramLink(s.link);
      })
      .catch(() => {});
  }, [accessToken, user, isReady, router, load]);

  const refreshTelegramStatus = useCallback(async () => {
    if (!accessToken || telegramConnected) return;
    try {
      const s = await api.getTelegramStatus(accessToken);
      setTelegramConnected(s.connected);
      if (s.connected) setTelegramLink(null);
      else if (s.link) setTelegramLink(s.link);
    } catch {
      // ignore
    }
  }, [accessToken, telegramConnected]);

  usePolling(refreshTelegramStatus, !!accessToken && !telegramConnected, 3000);

  const hasPendingOrders = (data?.summary.pendingOrders ?? 0) > 0;
  usePolling(
    refreshData,
    !!accessToken && !loading && (hasPendingOrders || !!telegramConnected),
    3000,
  );

  if (!isReady || !isAuthenticated) return null;

  const recentJobsPaginated = data
    ? paginate(data.recentJobs, recentPage, RECENT_JOBS_PAGE_SIZE)
    : null;

  return (
    <div className="min-h-screen pb-nav bg-background">
      <div className="bg-gradient-to-br from-primary via-primary to-accent px-5 pt-8 pb-8">
        <PageContainer>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/80 text-sm">{t.welcomePro},</p>
              <h1 className="text-2xl font-bold text-white">
                {user?.name ?? t.roleProfessional}
              </h1>
              {user?.isVerified === false ? (
                <span className="mt-1.5 inline-flex items-center rounded-lg bg-error/90 px-2.5 py-1 text-xs font-bold text-white">
                  {t.blocked}
                </span>
              ) : (
                <span className="mt-1.5 inline-flex items-center rounded-lg bg-success/90 px-2.5 py-1 text-xs font-bold text-white">
                  {t.accountActive}
                </span>
              )}
              {data && (
                <p className="text-white/70 text-sm mt-1">
                  {data.profile.district ?? "Toshkent"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSelect variant="onDark" />
              <NotificationBell variant="onDark" />
              <Link
                href="/faq"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-white border border-white/30 hover:bg-white/10 transition"
                aria-label={t.helpFaq}
              >
                <HelpCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="-mt-4 space-y-5 pb-6">
        <AccountStatusBanner
          blocked={user?.isVerified === false}
          blockedTitle={t.accountBlocked}
          blockedDesc={t.accountBlockedDesc}
          activeTitle={t.accountActive}
          activeDesc={t.accountActiveDesc}
        />

        <DateRangeFilter
          open={filterOpen}
          onOpenChange={setFilterOpen}
          appliedRange={appliedRange}
          draftRange={draftRange}
          onDraftChange={setDraftRange}
          onApply={applyFilter}
          locale={locale}
          labels={{
            filter: t.filter,
            selectPeriod: t.selectPeriod,
            confirm: t.confirm,
            cancel: t.cancel,
          }}
        />

        {loading ? (
          <DashboardSkeleton />
        ) : !data ? (
          <EmptyState icon="alert" title={t.error} />
        ) : (
          <>
            <Card className="shadow-lg border-0 bg-gradient-to-br from-accent to-primary text-white">
              <CardBody className="p-6">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                  <Wallet className="h-4 w-4" />
                  {t.totalEarnings}
                </div>
                <p className="text-3xl md:text-4xl font-bold">
                  {formatPrice(data.summary.totalEarnings, locale)}{" "}
                  <span className="text-lg font-medium">so&apos;m</span>
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    {
                      icon: ClipboardList,
                      label: t.completedOrders,
                      value: data.summary.completedOrders,
                    },
                    {
                      icon: TrendingUp,
                      label: t.pendingOrders,
                      value: data.summary.pendingOrders,
                    },
                    {
                      icon: CalendarDays,
                      label: t.avgPerOrder,
                      value: formatPrice(data.summary.avgPerOrder, locale),
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-white/15 backdrop-blur p-3 text-center"
                    >
                      <Icon className="h-4 w-4 mx-auto mb-1 text-white/80" />
                      <p className="text-sm font-bold">{value}</p>
                      <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Link href="/reviews" className="block">
              <Card className="hover:shadow-md transition">
                <CardBody className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                      <Star className="h-5 w-5 text-star fill-star" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-primary">{t.myReviews}</p>
                      <p className="text-sm text-muted">
                        {data.profile.reviewCount} {t.reviews}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted shrink-0" />
                </CardBody>
              </Card>
            </Link>

            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#229ED9]/15">
                    <Send className="h-5 w-5 text-[#229ED9]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-primary">{t.telegramBot}</p>
                    <p className="text-sm text-muted">{t.telegramConnectDesc}</p>
                  </div>
                  {telegramConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : null}
                </div>
                {telegramConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 px-4 py-3">
                      <p className="text-sm font-medium text-success">{t.telegramConnected}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={telegramLoading}
                        onClick={async () => {
                          if (!accessToken) return;
                          setTelegramLoading(true);
                          try {
                            await api.disconnectTelegram(accessToken);
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
                      {t.telegramStatusHint}
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
                          const res = await api.createTelegramLink(accessToken);
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

            <Card>
              <CardBody>
                <h2 className="font-bold text-primary mb-4">{t.ordersChart}</h2>
                {data.monthlyOrders.length === 0 ? (
                  <EmptyState title={t.noData} variant="compact" className="py-6" />
                ) : (
                  <MonthlyOrdersChart
                    data={data.monthlyOrders}
                    locale={locale}
                    ordersLabel={t.completedOrders}
                    earningsLabel={t.earnings}
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="font-bold text-primary mb-3">{t.dailyEarnings}</h2>
                {data.dailyEarnings.length === 0 ? (
                  <EmptyState title={t.noData} variant="compact" />
                ) : (
                  <ScrollableList hint={t.scrollForMore}>
                    <div className="space-y-2 pr-1">
                      {data.dailyEarnings.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between rounded-lg bg-accent-soft/40 px-3 py-2.5"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {formatDayLabel(day.date, locale as "uz" | "ru")}
                            </p>
                            <p className="text-xs text-muted">
                              {day.orders} {t.ordersCount}
                            </p>
                          </div>
                          <p className="font-bold text-primary text-sm">
                            +{formatPrice(day.amount, locale)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollableList>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="font-bold text-primary mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t.topLocations}
                </h2>
                {data.topLocations.length === 0 ? (
                  <EmptyState title={t.noData} variant="compact" />
                ) : (
                  <ScrollableList hint={t.scrollForMore}>
                    <div className="space-y-2 pr-1">
                      {data.topLocations.map((loc) => (
                        <div
                          key={loc.address}
                          className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{loc.address}</p>
                            <p className="text-xs text-muted">
                              {loc.count} {t.ordersCount}
                            </p>
                          </div>
                          <p className="font-semibold text-accent shrink-0">
                            {formatPrice(loc.earnings, locale)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollableList>
                )}
              </CardBody>
            </Card>

            {data.pendingOrdersList.length > 0 && (
              <section>
                <h2 className="font-bold text-primary mb-3">{t.newOrders}</h2>
                <div className="flex flex-col gap-3">
                  {data.pendingOrdersList.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      locale={locale}
                      t={t}
                      showBadge
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-bold text-primary mb-3">{t.recentJobs}</h2>
              {data.recentJobs.length === 0 ? (
                <EmptyState title={t.noData} variant="compact" className="py-6" />
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {recentJobsPaginated!.items.map((job) => (
                      <JobRow key={job.id} job={job} locale={locale} t={t} />
                    ))}
                  </div>
                  <ListPagination
                    page={recentJobsPaginated!.page}
                    totalPages={recentJobsPaginated!.totalPages}
                    total={recentJobsPaginated!.total}
                    pageSize={RECENT_JOBS_PAGE_SIZE}
                    onPageChange={setRecentPage}
                    labels={{ prev: t.prevPage, next: t.nextPage }}
                  />
                </>
              )}
            </section>
          </>
        )}
      </PageContainer>
    </div>
  );
}
