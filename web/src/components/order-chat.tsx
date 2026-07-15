"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api, type OrderMessage } from "@/lib/api";
import { usePolling } from "@/hooks/use-polling";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  orderId: string;
  accessToken: string;
  currentUserId: string;
  clientId: string;
  masterId: string | null;
  readOnly: boolean;
  labels: {
    title: string;
    placeholder: string;
    send: string;
    closed: string;
    empty: string;
    loading: string;
    roleCustomer: string;
    rolePro: string;
    you: string;
  };
};

function resolveIsPro(
  msg: OrderMessage,
  clientId: string,
  masterId: string | null,
) {
  if (msg.sender?.role === "professional") return true;
  if (msg.sender?.role === "customer") return false;
  if (masterId && msg.senderId === masterId) return true;
  if (msg.senderId === clientId) return false;
  // Agar id mos kelmasa — master tarafi deb emas, mijoz deb emas; left (mijoz uslubi)
  return false;
}

export function OrderChat({
  orderId,
  accessToken,
  currentUserId,
  clientId,
  masterId,
  readOnly,
  labels,
}: Props) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  const loadMessages = useCallback(async () => {
    try {
      const list = await api.getMessages(accessToken, orderId);
      setMessages(list);
      void api.markMessagesRead(accessToken, orderId);
    } catch {
      // ignore polling errors
    } finally {
      setLoading(false);
    }
  }, [accessToken, orderId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  usePolling(loadMessages, !readOnly || loading, 4000);

  useEffect(() => {
    if (!messages.length) return;
    bottomRef.current?.scrollIntoView({
      behavior: initialScrollDone.current ? "smooth" : "auto",
    });
    initialScrollDone.current = true;
  }, [messages.length]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending || readOnly) return;
    setSending(true);
    try {
      const created = await api.sendMessage(accessToken, orderId, { text: value });
      setMessages((prev) => [...prev, created]);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const resolvedMasterId = masterId ?? undefined;

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-bold text-primary">{labels.title}</h2>
        {readOnly && (
          <p className="mt-0.5 text-xs text-muted">{labels.closed}</p>
        )}
      </div>

      <div className="flex max-h-72 min-h-[11rem] flex-col gap-2.5 overflow-y-auto bg-[#f7f8fa] px-3 py-3">
        {loading && (
          <p className="py-8 text-center text-sm text-muted">{labels.loading}</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">{labels.empty}</p>
        )}
        {messages.map((msg) => {
          const mine = msg.senderId === currentUserId;
          const isPro = resolveIsPro(msg, clientId, resolvedMasterId ?? null);
          const roleLabel = isPro ? labels.rolePro : labels.roleCustomer;
          const displayName = msg.sender?.name?.trim() || null;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                // Mijoz chapda, usta o'ngda — kim qarayotganidan qat'i nazar
                isPro ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  isPro
                    ? cn(
                        "rounded-br-md",
                        mine
                          ? "bg-accent text-white"
                          : "border border-amber-200 bg-amber-50 text-foreground",
                      )
                    : cn(
                        "rounded-bl-md",
                        mine
                          ? "border border-sky-300 bg-sky-100 text-foreground"
                          : "border border-sky-100 bg-sky-50 text-foreground",
                      ),
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      isPro
                        ? mine
                          ? "bg-white/20 text-white"
                          : "bg-amber-200/80 text-amber-950"
                        : "bg-sky-200/80 text-sky-950",
                    )}
                  >
                    {roleLabel}
                  </span>
                  {mine ? (
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        isPro && mine ? "text-white/80" : "text-muted",
                      )}
                    >
                      {labels.you}
                    </span>
                  ) : (
                    displayName && (
                      <span className="text-[11px] font-semibold text-muted">
                        {displayName}
                      </span>
                    )
                  )}
                </div>
                {msg.text && (
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                )}
                {msg.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imageUrl}
                    alt=""
                    className="mt-1 max-h-40 rounded-lg object-cover"
                  />
                )}
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    isPro && mine ? "text-white/70" : "text-muted",
                  )}
                >
                  {formatTime(msg.sentAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!readOnly && (
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={labels.placeholder}
            className="h-11 flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            maxLength={2000}
          />
          <Button
            type="submit"
            size="sm"
            className="h-11 w-11 shrink-0 px-0"
            disabled={sending || !text.trim()}
            aria-label={labels.send}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </section>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
