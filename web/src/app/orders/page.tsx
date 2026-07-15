"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { usePolling } from "@/hooks/use-polling";
import { useAuth } from "@/store/auth";
import { useI18n } from "@/i18n/provider";
import { api, type Order } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderListSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { NotificationBell } from "@/components/notification-bell";
import { formatPrice, cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { serviceName } from "@/i18n";
import {
  ListPagination,
  ORDERS_PAGE_SIZE,
  paginate,
} from "@/components/list-pagination";

const statusVariant: Record<string, "warning" | "accent" | "primary" | "success" | "error"> = {
  pending: "warning",
  accepted: "accent",
  on_the_way: "primary",
  in_progress: "primary",
  completed: "success",
  cancelled: "error",
};

type ProOrderTab = "unconfirmed" | "completed" | "cancelled";
type CustomerOrderTab = "pending" | "active" | "completed" | "cancelled";
type OrderTab = ProOrderTab | CustomerOrderTab;

const PRO_TABS = new Set<ProOrderTab>(["unconfirmed", "completed", "cancelled"]);
const CUSTOMER_TABS = new Set<CustomerOrderTab>([
  "pending",
  "active",
  "completed",
  "cancelled",
]);

const STATUS_ACTIONS: Record<string, { label: string; next: string }> = {
  accepted: { label: "Yo'lga chiqdim", next: "on_the_way" },
  on_the_way: { label: "Ishni boshladim", next: "in_progress" },
  in_progress: { label: "Yakunladim", next: "completed" },
};

const ACTIVE_STATUSES = new Set(["accepted", "on_the_way", "in_progress"]);

function filterProOrders(orders: Order[], tab: ProOrderTab) {
  switch (tab) {
    case "unconfirmed":
      return orders.filter(
        (o) => o.status === "pending" || ACTIVE_STATUSES.has(o.status),
      );
    case "completed":
      return orders.filter((o) => o.status === "completed");
    case "cancelled":
      return orders.filter((o) => o.status === "cancelled");
  }
}

function filterCustomerOrders(orders: Order[], tab: CustomerOrderTab) {
  switch (tab) {
    case "pending":
      return orders.filter(
        (o) => o.status === "pending" || o.status === "awaiting_payment",
      );
    case "active":
      return orders.filter((o) => ACTIVE_STATUSES.has(o.status));
    case "completed":
      return orders.filter((o) => o.status === "completed");
    case "cancelled":
      return orders.filter((o) => o.status === "cancelled");
  }
}

function isValidOrderTab(
  tab: string | null,
  isProfessional: boolean,
): tab is OrderTab {
  if (!tab) return false;
  return isProfessional
    ? PRO_TABS.has(tab as ProOrderTab)
    : CUSTOMER_TABS.has(tab as CustomerOrderTab);
}

function OrderCard({
  order,
  locale,
  isProfessional,
  t,
  acting,
  isDeclining,
  declineReason,
  onDeclineReasonChange,
  onAccept,
  onStartDecline,
  onCancelDecline,
  onConfirmDecline,
  onStatusUpdate,
  onSkipStatus,
  onUnskipStatus,
  onCompleteOrder,
  skippedStatus,
}: {
  order: Order;
  locale: "uz" | "ru";
  isProfessional: boolean;
  t: {
    status: Record<string, string>;
    accept: string;
    decline: string;
    declineReason: string;
    declineReasonPlaceholder: string;
    declineReasonRequired: string;
    confirmDecline: string;
    cancel: string;
    cancelReason: string;
    skip: string;
    completeOrder: string;
    showStatusActions: string;
  };
  acting?: boolean;
  isDeclining?: boolean;
  declineReason?: string;
  onDeclineReasonChange?: (value: string) => void;
  onAccept?: (id: string) => void;
  onStartDecline?: (id: string) => void;
  onCancelDecline?: () => void;
  onConfirmDecline?: (id: string, reason: string) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  onSkipStatus?: (id: string) => void;
  onUnskipStatus?: (id: string) => void;
  onCompleteOrder?: (id: string) => void;
  skippedStatus?: boolean;
}) {
  const statusAction = STATUS_ACTIONS[order.status];
  const showPendingActions = isProfessional && order.status === "pending";
  const showStatusAction = isProfessional && !!statusAction;

  return (
    <Card className="hover:shadow-md transition flex flex-col overflow-hidden">
      <Link href={`/orders/${order.id}`} className="block flex-1">
        <CardBody>
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-primary truncate">
                {order.service ? serviceName(order.service, locale) : "Xizmat"}
              </p>
              <p className="text-sm text-muted mt-0.5">
                {isProfessional
                  ? (order.client?.name ?? "—")
                  : (order.master?.name ?? "—")}
              </p>
              {!isProfessional && order.master?.phone && (
                <p className="text-xs text-muted mt-1 flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{formatPhoneDisplay(order.master.phone)}</span>
                </p>
              )}
              {isProfessional && order.client?.phone && (
                <p className="text-xs text-muted mt-1 flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{formatPhoneDisplay(order.client.phone)}</span>
                </p>
              )}
              {isProfessional && order.address && (
                <p className="text-xs text-muted mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{order.address}</span>
                </p>
              )}
            </div>
            <Badge variant={statusVariant[order.status] ?? "default"} className="shrink-0">
              {t.status[order.status as keyof typeof t.status] ?? order.status}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              {order.scheduledAt
                ? new Date(order.scheduledAt).toLocaleDateString()
                : order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString()
                  : "—"}
            </span>
            <span className="font-semibold text-primary">
              {formatPrice(order.price, locale)} so&apos;m
            </span>
          </div>
          {order.status === "cancelled" && order.cancelReason && (
            <p className="text-xs text-error mt-2 line-clamp-2">
              <span className="font-semibold">{t.cancelReason}:</span> {order.cancelReason}
            </p>
          )}
        </CardBody>
      </Link>

      {showPendingActions && !isDeclining && (
        <div className="flex gap-2 border-t border-border/60 px-4 py-3 bg-accent-soft/40">
          <Button
            size="sm"
            className="flex-1"
            disabled={acting}
            onClick={() => onAccept?.(order.id)}
          >
            {t.accept}
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="flex-1"
            disabled={acting}
            onClick={() => onStartDecline?.(order.id)}
          >
            {t.decline}
          </Button>
        </div>
      )}

      {showPendingActions && isDeclining && (
        <div className="border-t border-border/60 px-4 py-3 bg-accent-soft/40 space-y-2">
          <label className="block text-xs font-semibold text-primary">
            {t.declineReason}
          </label>
          <textarea
            value={declineReason ?? ""}
            onChange={(e) => onDeclineReasonChange?.(e.target.value)}
            placeholder={t.declineReasonPlaceholder}
            rows={3}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled={acting}
              onClick={onCancelDecline}
            >
              {t.cancel}
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="flex-1"
              disabled={acting || !declineReason?.trim()}
              onClick={() => onConfirmDecline?.(order.id, declineReason!.trim())}
            >
              {t.confirmDecline}
            </Button>
          </div>
        </div>
      )}

      {showStatusAction && skippedStatus && (
        <div className="border-t border-border/60 px-4 py-3 bg-accent-soft/40 space-y-2">
          <Button
            size="sm"
            className="w-full"
            disabled={acting}
            onClick={() => onCompleteOrder?.(order.id)}
          >
            {t.completeOrder}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted hover:text-accent transition"
            onClick={() => onUnskipStatus?.(order.id)}
          >
            {t.showStatusActions}
          </button>
        </div>
      )}

      {showStatusAction && !skippedStatus && (
        <div className="border-t border-border/60 px-4 py-3 bg-accent-soft/40">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled={acting}
              onClick={() => onSkipStatus?.(order.id)}
            >
              {t.skip}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={acting}
              onClick={() => onStatusUpdate?.(order.id, statusAction.next)}
            >
              {statusAction.label}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OrdersPage() {
  const { accessToken, isReady, isAuthenticated } = useRequireAuth();
  const user = useAuth((s) => s.user);
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isProfessional = user?.role === "professional";
  const defaultTab: OrderTab = isProfessional ? "unconfirmed" : "pending";
  const initialTab: OrderTab = isValidOrderTab(tabParam, isProfessional)
    ? tabParam
    : defaultTab;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<OrderTab>(initialTab);
  const [actingId, setActingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [skippedStatusIds, setSkippedStatusIds] = useState<Set<string>>(new Set());

  const refreshOrders = useCallback(async () => {
    if (!accessToken) return;
    const updated = await api.getOrders(accessToken);
    setOrders(updated);
  }, [accessToken]);

  useEffect(() => {
    if (isValidOrderTab(tabParam, isProfessional)) {
      setActiveTab(tabParam);
      setPage(1);
    }
  }, [tabParam, isProfessional]);

  useEffect(() => {
    if (!isReady || !accessToken) return;
    if (!isValidOrderTab(tabParam, isProfessional)) {
      setActiveTab(isProfessional ? "unconfirmed" : "pending");
    }
    setPage(1);
    api.getOrders(accessToken).then(setOrders).finally(() => setLoading(false));
  }, [accessToken, isReady, isProfessional, tabParam]);

  const hasActiveOrders = orders.some((o) =>
    ["pending", "accepted", "on_the_way", "in_progress"].includes(o.status),
  );
  usePolling(refreshOrders, !loading && hasActiveOrders, 3000);

  const handleAccept = async (id: string) => {
    if (!accessToken || actingId) return;
    setActingId(id);
    try {
      await api.acceptOrder(accessToken, id);
      await refreshOrders();
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (id: string, reason: string) => {
    if (!accessToken || actingId || !reason.trim()) return;
    setActingId(id);
    try {
      await api.declineOrder(accessToken, id, reason.trim());
      setDecliningId(null);
      setDeclineReason("");
      setActiveTab("cancelled");
      setPage(1);
      await refreshOrders();
    } finally {
      setActingId(null);
    }
  };

  const handleStartDecline = (id: string) => {
    setDecliningId(id);
    setDeclineReason("");
  };

  const handleCancelDecline = () => {
    setDecliningId(null);
    setDeclineReason("");
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!accessToken || actingId) return;
    setActingId(id);
    try {
      await api.updateOrderStatus(accessToken, id, status);
      setSkippedStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await refreshOrders();
    } finally {
      setActingId(null);
    }
  };

  const handleSkipStatus = (id: string) => {
    setSkippedStatusIds((prev) => new Set(prev).add(id));
  };

  const handleUnskipStatus = (id: string) => {
    setSkippedStatusIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleCompleteOrder = (id: string) => {
    void handleStatusUpdate(id, "completed");
  };

  const proCounts = useMemo(
    () => ({
      unconfirmed: filterProOrders(orders, "unconfirmed").length,
      completed: filterProOrders(orders, "completed").length,
      cancelled: filterProOrders(orders, "cancelled").length,
    }),
    [orders],
  );

  const customerCounts = useMemo(
    () => ({
      pending: filterCustomerOrders(orders, "pending").length,
      active: filterCustomerOrders(orders, "active").length,
      completed: filterCustomerOrders(orders, "completed").length,
      cancelled: filterCustomerOrders(orders, "cancelled").length,
    }),
    [orders],
  );

  const filteredOrders = isProfessional
    ? filterProOrders(orders, activeTab as ProOrderTab)
    : filterCustomerOrders(orders, activeTab as CustomerOrderTab);

  const paginated = paginate(filteredOrders, page, ORDERS_PAGE_SIZE);

  const proTabs: { id: ProOrderTab; label: string; count: number }[] = [
    { id: "unconfirmed", label: t.orderTabUnconfirmed, count: proCounts.unconfirmed },
    { id: "completed", label: t.orderTabCompleted, count: proCounts.completed },
    { id: "cancelled", label: t.orderTabCancelled, count: proCounts.cancelled },
  ];

  const customerTabs: { id: CustomerOrderTab; label: string; count: number }[] = [
    { id: "pending", label: t.orderTabPending, count: customerCounts.pending },
    { id: "active", label: t.orderTabActive, count: customerCounts.active },
    { id: "completed", label: t.orderTabCompleted, count: customerCounts.completed },
    { id: "cancelled", label: t.orderTabCancelled, count: customerCounts.cancelled },
  ];

  const orderTabs = isProfessional ? proTabs : customerTabs;

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-nav">
      <PageContainer className="py-5 md:py-8">
        <div className="flex items-center justify-between gap-3 mb-5 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            {t.ordersNav}
          </h1>
          <NotificationBell />
        </div>

        {!loading && (
          <div className="flex gap-2 flex-wrap md:gap-3 pb-1 mb-4 md:mb-6 overflow-x-auto scrollbar-none md:overflow-visible">
            {orderTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "bg-accent text-white shadow-md"
                    : "bg-white border border-border text-muted hover:border-accent",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[1.25rem] text-center",
                    activeTab === tab.id ? "bg-white/25 text-white" : "bg-accent-soft text-accent",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <OrderListSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title={t.noOrdersYet}
            action={!isProfessional ? { label: t.findPro, href: "/" } : undefined}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState icon="clipboard" title={t.noOrdersInTab} />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
              {paginated.items.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  locale={locale}
                  isProfessional={isProfessional}
                  t={t}
                  acting={actingId === order.id}
                  isDeclining={decliningId === order.id}
                  declineReason={decliningId === order.id ? declineReason : ""}
                  onDeclineReasonChange={setDeclineReason}
                  onAccept={isProfessional ? handleAccept : undefined}
                  onStartDecline={isProfessional ? handleStartDecline : undefined}
                  onCancelDecline={handleCancelDecline}
                  onConfirmDecline={isProfessional ? handleDecline : undefined}
                  onStatusUpdate={isProfessional ? handleStatusUpdate : undefined}
                  onSkipStatus={isProfessional ? handleSkipStatus : undefined}
                  onUnskipStatus={isProfessional ? handleUnskipStatus : undefined}
                  onCompleteOrder={isProfessional ? handleCompleteOrder : undefined}
                  skippedStatus={skippedStatusIds.has(order.id)}
                />
              ))}
            </div>
            <ListPagination
              page={paginated.page}
              totalPages={paginated.totalPages}
              total={paginated.total}
              pageSize={ORDERS_PAGE_SIZE}
              onPageChange={setPage}
              labels={{ prev: t.prevPage, next: t.nextPage }}
            />
          </>
        )}
      </PageContainer>
    </div>
  );
}
