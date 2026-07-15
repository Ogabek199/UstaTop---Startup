"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Phone } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { usePolling } from "@/hooks/use-polling";
import { useI18n } from "@/i18n/provider";
import { api, type Order } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderDetailSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { OrderChat } from "@/components/order-chat";
import { formatPrice } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { serviceName } from "@/i18n";

const CLIENT_CANCELABLE = new Set(["awaiting_payment", "pending", "accepted"]);
const ACCEPT_TIMEOUT_MS = 30 * 60 * 1000;
const EXPRESS_ACCEPT_TIMEOUT_MS = 15 * 60 * 1000;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paid = searchParams.get("paid");
  const { accessToken, user } = useAuth();
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [skippedStatus, setSkippedStatus] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);

  const STATUS_ACTIONS: Record<string, { label: string; next: string }> = {
    accepted: { label: "Yo'lga chiqdim", next: "on_the_way" },
    on_the_way: { label: "Ishni boshladim", next: "in_progress" },
    in_progress: { label: "Yakunladim", next: "completed" },
  };

  useEffect(() => {
    if (!isReady || !accessToken) return;
    api.getOrder(accessToken, id).then(setOrder).finally(() => setLoading(false));
  }, [accessToken, id, isReady]);

  const refreshOrder = useCallback(async () => {
    if (!accessToken) return;
    try {
      const updated = await api.getOrder(accessToken, id);
      setOrder(updated);
    } catch {
      // ignore polling errors
    }
  }, [accessToken, id]);

  usePolling(
    refreshOrder,
    !!accessToken &&
      !!order &&
      ["pending", "accepted", "on_the_way", "in_progress"].includes(order.status),
    3000,
  );

  useEffect(() => {
    if (order?.status !== "pending") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status]);

  const acceptDeadlineMs = useMemo(() => {
    if (!order?.createdAt || order.status !== "pending") return null;
    const created = new Date(order.createdAt).getTime();
    const limit = order.isExpress ? EXPRESS_ACCEPT_TIMEOUT_MS : ACCEPT_TIMEOUT_MS;
    return created + limit;
  }, [order]);

  const remainingAcceptMs =
    acceptDeadlineMs != null ? Math.max(0, acceptDeadlineMs - now) : null;

  if (!isReady || !isAuthenticated) return null;

  const submitReview = async () => {
    if (!accessToken) return;
    await api.createReview(accessToken, id, { rating, comment });
    setReviewDone(true);
  };

  const updateStatus = async (status: string) => {
    if (!accessToken) return;
    const updated = await api.updateOrderStatus(accessToken, id, status);
    setOrder(updated);
    setSkippedStatus(false);
  };

  if (loading) return <OrderDetailSkeleton />;
  if (!order) {
    return (
      <div className="min-h-screen pb-nav">
        <div className="mx-auto max-w-lg px-5 py-5">
          <Link href="/orders" className="inline-flex gap-2 text-primary mb-4">
            <ArrowLeft className="h-5 w-5" /> {t.back}
          </Link>
          <EmptyState
            icon="clipboard"
            title={t.orderNotFound}
            action={{ label: t.viewMyOrders, href: "/orders" }}
            variant="card"
          />
        </div>
      </div>
    );
  }

  const isPro = user?.role === "professional";
  const statusAction = STATUS_ACTIONS[order.status];
  const showStatusAction = isPro && !!statusAction;
  const chatClosed = order.status === "completed" || order.status === "cancelled";
  const canCustomerCancel =
    !isPro && CLIENT_CANCELABLE.has(order.status);

  return (
    <div className="min-h-screen pb-nav">
      <div className="mx-auto max-w-lg px-5 py-5">
        <Link href={isPro ? "/dashboard" : "/orders"} className="inline-flex gap-2 text-primary mb-4">
          <ArrowLeft className="h-5 w-5" /> {t.back}
        </Link>

        {paid && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-success/10 p-4 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">{t.paymentSuccess}</span>
            </div>
            <Link href="/orders">
              <Button variant="secondary" className="w-full">
                {t.viewMyOrders}
              </Button>
            </Link>
          </div>
        )}

        {!isPro && order.status === "awaiting_payment" && (
          <div className="mb-4 space-y-3">
            <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted">
              {t.awaitingPaymentHint}
            </div>
            <Button
              className="w-full"
              disabled={paying}
              onClick={async () => {
                if (!accessToken || paying) return;
                setPaying(true);
                try {
                  await api.createPayment(accessToken, id, "payme");
                  const updated = await api.getOrder(accessToken, id);
                  setOrder(updated);
                  router.replace(`/orders/${id}?paid=1`);
                } finally {
                  setPaying(false);
                }
              }}
            >
              {paying ? t.loading : t.pay}
            </Button>
          </div>
        )}

        {!isPro && order.status === "accepted" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-success/10 p-4 text-success">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="font-semibold">{t.orderAcceptedNotify}</span>
          </div>
        )}

        {order.status === "pending" && remainingAcceptMs != null && (
          <div className="mb-4 rounded-xl border border-border bg-white px-4 py-3 text-sm">
            <p className="font-semibold text-primary">{t.acceptCountdownTitle}</p>
            <p className="mt-1 text-muted">
              {remainingAcceptMs > 0
                ? t.acceptCountdown
                    .replace("{time}", formatCountdown(remainingAcceptMs))
                : t.acceptCountdownExpired}
            </p>
          </div>
        )}

        <Card className="mb-4">
          <CardBody className="space-y-3">
            <div className="flex justify-between">
              <h1 className="font-bold text-lg text-primary">
                {order.service ? serviceName(order.service, locale) : "Buyurtma"}
              </h1>
              <Badge variant="accent">
                {t.status[order.status as keyof typeof t.status] ?? order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted">{order.description}</p>
            {isPro && (
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted">{t.client}:</span>{" "}
                  {order.client?.name ?? "—"}
                </p>
                {order.client?.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted shrink-0" />
                    <a
                      href={`tel:${order.client.phone}`}
                      className="text-accent font-medium hover:underline"
                    >
                      {formatPhoneDisplay(order.client.phone)}
                    </a>
                  </p>
                )}
              </div>
            )}
            <p className="text-sm"><span className="text-muted">{t.address}:</span> {order.address}</p>
            <p className="font-bold text-primary text-xl">
              {formatPrice(order.price, locale)} so&apos;m
            </p>
            {order.status === "cancelled" && order.cancelReason && (
              <p className="text-sm text-error rounded-xl bg-error/5 p-3">
                <span className="font-semibold">{t.cancelReason}:</span> {order.cancelReason}
              </p>
            )}
          </CardBody>
        </Card>

        {isPro && order.status === "pending" && !showDeclineForm && (
          <div className="flex gap-3 mb-4">
            <Button
              className="flex-1"
              onClick={async () => {
                await api.acceptOrder(accessToken!, id);
                const updated = await api.getOrder(accessToken!, id);
                setOrder(updated);
              }}
            >
              {t.accept}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => setShowDeclineForm(true)}
            >
              {t.decline}
            </Button>
          </div>
        )}

        {isPro && order.status === "pending" && showDeclineForm && (
          <Card className="mb-4">
            <CardBody className="space-y-3">
              <label className="block text-sm font-semibold text-primary">
                {t.declineReason}
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={t.declineReasonPlaceholder}
                rows={3}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={declining}
                  onClick={() => {
                    setShowDeclineForm(false);
                    setDeclineReason("");
                  }}
                >
                  {t.cancel}
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={declining || !declineReason.trim()}
                  onClick={async () => {
                    if (!accessToken || !declineReason.trim()) return;
                    setDeclining(true);
                    try {
                      await api.declineOrder(accessToken, id, declineReason.trim());
                      router.push("/orders?tab=cancelled");
                    } finally {
                      setDeclining(false);
                    }
                  }}
                >
                  {t.confirmDecline}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {showStatusAction && skippedStatus && (
          <div className="mb-4 space-y-2">
            <Button className="w-full" onClick={() => updateStatus("completed")}>
              {t.completeOrder}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted hover:text-accent transition"
              onClick={() => setSkippedStatus(false)}
            >
              {t.showStatusActions}
            </button>
          </div>
        )}

        {showStatusAction && !skippedStatus && (
          <div className="flex gap-3 mb-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setSkippedStatus(true)}
            >
              {t.skip}
            </Button>
            <Button
              className="flex-1"
              onClick={() => updateStatus(statusAction.next)}
            >
              {statusAction.label}
            </Button>
          </div>
        )}

        {canCustomerCancel && !showCancelForm && (
          <Button
            variant="danger"
            className="mb-4 w-full"
            onClick={() => setShowCancelForm(true)}
          >
            {t.cancelOrder}
          </Button>
        )}

        {canCustomerCancel && showCancelForm && (
          <Card className="mb-4">
            <CardBody className="space-y-3">
              <label className="block text-sm font-semibold text-primary">
                {t.cancelOrderReason}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t.cancelOrderReasonPlaceholder}
                rows={3}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
              />
              <p className="text-xs text-muted">{t.cancelOrderHint}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button
                  variant="secondary"
                  className="w-full sm:flex-1"
                  disabled={cancelling}
                  onClick={() => {
                    setShowCancelForm(false);
                    setCancelReason("");
                  }}
                >
                  {t.back}
                </Button>
                <Button
                  variant="danger"
                  className="w-full sm:flex-1"
                  disabled={cancelling}
                  onClick={async () => {
                    if (!accessToken) return;
                    setCancelling(true);
                    try {
                      const updated = await api.cancelOrder(
                        accessToken,
                        id,
                        cancelReason.trim() || undefined,
                      );
                      setOrder(updated);
                      setShowCancelForm(false);
                    } finally {
                      setCancelling(false);
                    }
                  }}
                >
                  {t.confirmCancelOrder}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {accessToken && user && (
          <OrderChat
            orderId={id}
            accessToken={accessToken}
            currentUserId={user.id}
            clientId={order.clientId}
            masterId={order.masterId ?? order.master?.id ?? null}
            readOnly={chatClosed}
            labels={{
              title: t.chatTitle,
              placeholder: t.chatPlaceholder,
              send: t.chatSend,
              closed: t.chatClosed,
              empty: t.chatEmpty,
              loading: t.loading,
              roleCustomer: t.chatRoleCustomer,
              rolePro: t.chatRolePro,
              you: t.chatYou,
            }}
          />
        )}

        {!isPro && order.status === "completed" && !order.review && !reviewDone && (
          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-bold">{t.leaveReview}</h2>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`text-2xl ${n <= rating ? "text-star" : "text-border"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <Input
                placeholder="Sharh (ixtiyoriy)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button onClick={submitReview}>{t.submit}</Button>
            </CardBody>
          </Card>
        )}

        {reviewDone && (
          <p className="text-center text-success font-semibold py-4">{t.thankYou}</p>
        )}
      </div>
    </div>
  );
}

function formatCountdown(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
