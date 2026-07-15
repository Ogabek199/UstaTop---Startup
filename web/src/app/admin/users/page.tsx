"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Clock,
  Wrench,
  UserRound,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  Ban,
  ShieldCheck,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useI18n } from "@/i18n/provider";
import { api, type AdminUser } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { UserAvatar } from "@/components/user-avatar";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "customer" | "professional";

const PAGE_SIZE = 5;

export default function AdminUsersPage() {
  const { accessToken, isAdmin, user: me } = useRequireAdmin();
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.getAdminUsers(accessToken, {
        page,
        limit: PAGE_SIZE,
        pending: filter === "pending",
        role:
          filter === "customer" || filter === "professional"
            ? filter
            : undefined,
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
  }, [accessToken, page, filter, t.error]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const roleLabel = (role: AdminUser["role"]) => {
    if (role === "professional") return t.roleProfessional;
    if (role === "admin") return t.roleAdmin;
    return t.roleCustomer;
  };

  const runAction = async (
    userId: string,
    action: "approve" | "block" | "unblock",
  ) => {
    if (!accessToken) return;
    setBusyId(userId);
    try {
      if (action === "approve")
        await api.approveProfessional(accessToken, userId);
      else if (action === "block") await api.blockUser(accessToken, userId);
      else await api.unblockUser(accessToken, userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusyId(null);
    }
  };

  const filters: {
    key: Filter;
    label: string;
    icon: typeof Users;
  }[] = [
    { key: "all", label: t.filterAll, icon: Users },
    { key: "pending", label: t.filterPending, icon: Clock },
    { key: "professional", label: t.filterProfessionals, icon: Wrench },
    { key: "customer", label: t.filterCustomers, icon: UserRound },
  ];

  const activeFilter = filters.find((f) => f.key === filter)!;

  return (
    <div className="space-y-5">
      {/* Header */}
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
              {t.adminUsers}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t.totalUsers}:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {total}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <activeFilter.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted">
                {activeFilter.label}
              </p>
              <p className="text-lg font-bold tabular-nums text-primary leading-tight">
                {loading ? "…" : total}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40" />
      </section>

      {/* Filters */}
      <div
        role="tablist"
        aria-label={t.adminUsers}
        className="flex gap-1.5 overflow-x-auto scroll-area pb-0.5"
      >
        {filters.map(({ key, label, icon: Icon }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "border border-border/80 bg-white text-muted hover:border-accent/40 hover:bg-accent-soft/60 hover:text-primary",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  active && "scale-105",
                )}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Spinner size="lg" />
          <p className="text-sm text-muted">{t.loading}</p>
        </div>
      ) : error ? (
        <Card className="border-error/20">
          <CardBody className="space-y-3 text-center py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error">
              <Ban className="h-5 w-5" />
            </span>
            <p className="text-error font-medium">{error}</p>
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
            <EmptyState title={t.noUsersFound} />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((u, index) => {
            const isMe = u.id === me?.id;
            const pending =
              u.role === "professional" &&
              u.masterProfile &&
              !u.masterProfile.isApproved;
            const approved =
              u.role === "professional" && u.masterProfile?.isApproved;
            const busy = busyId === u.id;
            const blocked = !u.isVerified;
            const rating = u.masterProfile
              ? Number(u.masterProfile.ratingAvg)
              : 0;

            return (
              <article
                key={u.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <Card
                  className={cn(
                    "overflow-hidden transition-all duration-200 hover:shadow-md hover:border-accent/25",
                    pending && "border-l-[3px] border-l-warning",
                    blocked && "border-l-[3px] border-l-error",
                    approved && !blocked && "border-l-[3px] border-l-success",
                  )}
                >
                  <CardBody className="space-y-4 p-4 sm:p-5">
                    <div className="flex gap-3.5">
                      <div className="relative shrink-0">
                        <UserAvatar
                          name={u.name}
                          avatarUrl={u.avatarUrl}
                          size="md"
                          className={cn(
                            "ring-2 ring-offset-2 ring-offset-white",
                            u.role === "professional"
                              ? "ring-accent/40"
                              : u.role === "admin"
                                ? "ring-warning/40"
                                : "ring-primary/25",
                            blocked && "opacity-60 grayscale-[0.4]",
                          )}
                        />
                        {approved && (
                          <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-5 w-5 fill-success text-white drop-shadow-sm" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-primary">
                              {u.name?.trim() || "—"}
                            </h2>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                              <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="tabular-nums">
                                {formatPhoneDisplay(u.phone)}
                              </span>
                            </p>
                          </div>

                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Badge
                              variant={
                                u.role === "professional"
                                  ? "accent"
                                  : u.role === "admin"
                                    ? "warning"
                                    : "primary"
                              }
                            >
                              {roleLabel(u.role)}
                            </Badge>
                            {blocked && (
                              <Badge variant="error">{t.blocked}</Badge>
                            )}
                            {pending && (
                              <Badge variant="warning">
                                {t.pendingApproval}
                              </Badge>
                            )}
                            {approved && (
                              <Badge variant="success">{t.approved}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                            {formatDateTime(u.createdAt, locale)}
                          </span>
                          {u.masterProfile?.district && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 opacity-70" />
                              {u.masterProfile.district}
                            </span>
                          )}
                          {u.masterProfile && (
                            <>
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Star className="h-3.5 w-3.5 fill-star text-star" />
                                {rating.toFixed(1)}
                                <span className="font-normal text-muted">
                                  ({u.masterProfile.reviewCount} {t.reviews})
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <ClipboardCheck className="h-3.5 w-3.5 opacity-70" />
                                {u.masterProfile.completedOrders}{" "}
                                {t.completedOrders}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isMe && (
                      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3.5">
                        {pending && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void runAction(u.id, "approve")}
                            className="gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {t.approve}
                          </Button>
                        )}
                        {u.isVerified ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy || u.role === "admin"}
                            onClick={() => void runAction(u.id, "block")}
                            className="gap-1.5"
                          >
                            <Ban className="h-4 w-4" />
                            {t.block}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void runAction(u.id, "unblock")}
                            className="gap-1.5"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {t.unblock}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </article>
            );
          })}

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
