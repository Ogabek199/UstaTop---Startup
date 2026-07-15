"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  ShieldCheck,
  Ban,
  CalendarDays,
  MapPin,
  UserRound,
  Wrench,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useI18n } from "@/i18n/provider";
import { serviceName } from "@/i18n";
import { api, type Order } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDateTime } from "@/lib/date";
import { formatPrice, cn } from "@/lib/utils";

const PAGE_SIZE = 5;

const STATUS_FILTERS = [
  "",
  "awaiting_payment",
  "pending",
  "accepted",
  "on_the_way",
  "in_progress",
  "completed",
  "cancelled",
] as const;

function statusVariant(
  status: string,
): "default" | "success" | "warning" | "error" | "accent" | "primary" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "error";
  if (status === "pending" || status === "awaiting_payment") return "warning";
  if (status === "accepted" || status === "on_the_way") return "accent";
  return "primary";
}

function statusBorder(status: string) {
  if (status === "completed") return "border-l-success";
  if (status === "cancelled") return "border-l-error";
  if (status === "pending" || status === "awaiting_payment")
    return "border-l-warning";
  if (status === "accepted" || status === "on_the_way" || status === "in_progress")
    return "border-l-accent";
  return "border-l-primary";
}

export default function AdminOrdersPage() {
  const { accessToken, isAdmin } = useRequireAdmin();
  const { t, locale } = useI18n();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.getAdminOrders(accessToken, {
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
      });
      setItems(res.items);
      setTotal(res.meta.total);
      setTotalPages(
        res.meta.totalPages ??
          Math.max(1, Math.ceil(res.meta.total / PAGE_SIZE)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, status, t.error]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const statusLabel = (s: string) =>
    (t.status as Record<string, string>)[s] ?? s;

  const activeStatusLabel = status ? statusLabel(status) : t.filterAll;

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
              {t.adminOrders}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t.totalOrders}:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {total}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted">
                {activeStatusLabel}
              </p>
              <p className="text-lg font-bold leading-tight tabular-nums text-primary">
                {loading ? "…" : total}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40" />
      </section>

      <div
        role="tablist"
        aria-label={t.adminOrders}
        className="flex gap-1.5 overflow-x-auto scroll-area pb-0.5"
      >
        {STATUS_FILTERS.map((key) => {
          const active = status === key;
          return (
            <button
              key={key || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "border border-border/80 bg-white text-muted hover:border-accent/40 hover:bg-accent-soft/60 hover:text-primary",
              )}
            >
              {key ? statusLabel(key) : t.filterAll}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Spinner size="lg" />
          <p className="text-sm text-muted">{t.loading}</p>
        </div>
      ) : error ? (
        <Card className="border-error/20">
          <CardBody className="space-y-3 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error">
              <Ban className="h-5 w-5" />
            </span>
            <p className="font-medium text-error">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-semibold text-accent hover:underline"
            >
              {t.retry}
            </button>
          </CardBody>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="py-6">
            <EmptyState title={t.noOrdersFound} />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((order, index) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="animate-fade-in-up block"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <Card
                className={cn(
                  "overflow-hidden border-l-[3px] transition-all duration-200 hover:border-accent/25 hover:shadow-md",
                  statusBorder(order.status),
                )}
              >
                <CardBody className="space-y-3.5 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-primary">
                          {order.service
                            ? serviceName(order.service, locale)
                            : "—"}
                        </h2>
                        {order.isExpress && (
                          <span
                            title={t.expressOrder}
                            className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning"
                          >
                            <Zap className="h-3 w-3" />
                            {t.expressOrder}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        {formatDateTime(order.createdAt ?? "", locale)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={statusVariant(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                      <p className="text-sm font-bold tabular-nums text-primary">
                        {formatPrice(order.price, locale)} so&apos;m
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-xl bg-background/80 p-3 text-xs sm:grid-cols-2">
                    <p className="flex items-start gap-2 min-w-0">
                      <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="min-w-0">
                        <span className="font-semibold text-foreground/80">
                          {t.client}:{" "}
                        </span>
                        <span className="text-muted">
                          {order.client?.name ?? "—"}
                          {order.client?.phone
                            ? ` · ${formatPhoneDisplay(order.client.phone)}`
                            : ""}
                        </span>
                      </span>
                    </p>
                    <p className="flex items-start gap-2 min-w-0">
                      <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="min-w-0">
                        <span className="font-semibold text-foreground/80">
                          {t.master}:{" "}
                        </span>
                        <span className="text-muted">
                          {order.master?.name ?? "—"}
                          {order.master?.phone
                            ? ` · ${formatPhoneDisplay(order.master.phone)}`
                            : ""}
                        </span>
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {order.address ? (
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{order.address}</span>
                      </p>
                    ) : (
                      <span />
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted/60" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}

          <ListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            labels={{ prev: t.prev, next: t.next }}
          />
        </div>
      )}
    </div>
  );
}
