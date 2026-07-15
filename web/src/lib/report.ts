import { useAuth } from "@/store/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ReportType =
  | "error"
  | "api_error"
  | "page_error"
  | "suggestion"
  | "feedback";

export type ReportPayload = {
  type: ReportType;
  message: string;
  pageUrl?: string;
  statusCode?: string;
  apiPath?: string;
  contact?: string;
};

const recent = new Map<string, number>();

function getReporterMeta() {
  const user = useAuth.getState().user;
  return {
    userName: user?.name ?? undefined,
    userPhone: user?.phone ?? undefined,
    userRole: user?.role ?? undefined,
    userId: user?.id ?? undefined,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    pageUrl:
      typeof window !== "undefined" ? window.location.href : undefined,
  };
}

/** Fire-and-forget report to Telegram via backend. Never throws. */
export function reportToAdmin(payload: ReportPayload): void {
  if (typeof window === "undefined") return;

  const key = `${payload.type}|${payload.message.slice(0, 100)}|${payload.apiPath ?? ""}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < 60_000) return;
  recent.set(key, now);

  const meta = getReporterMeta();

  void fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      pageUrl: payload.pageUrl ?? meta.pageUrl,
      userAgent: meta.userAgent,
      userName: meta.userName,
      userPhone: meta.userPhone,
      userRole: meta.userRole,
      userId: meta.userId,
    }),
  }).catch(() => {
    /* ignore network failures for telemetry */
  });
}

export async function submitSuggestion(body: {
  message: string;
  contact?: string;
}): Promise<{ ok: boolean }> {
  const meta = getReporterMeta();
  const res = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "suggestion",
      message: body.message,
      contact: body.contact,
      pageUrl: meta.pageUrl,
      userAgent: meta.userAgent,
      userName: meta.userName,
      userPhone: meta.userPhone,
      userRole: meta.userRole,
      userId: meta.userId,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message[0]
      : data.message;
    throw new Error(msg ?? "Yuborib bo'lmadi");
  }
  return { ok: true };
}
