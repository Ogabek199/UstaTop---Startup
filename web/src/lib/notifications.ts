export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: { orderId?: string; status?: string } | null;
  isRead: boolean;
  createdAt: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isJwtExpired(token: string, skewSeconds = 30): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function subscribeToPush(accessToken: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await registerServiceWorker();
  if (!registration) return false;

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  const keyRes = await fetch(`${API_URL}/notifications/push/vapid-key`);
  const { publicKey, enabled } = await keyRes.json();
  if (!enabled || !publicKey) return false;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  await fetch(`${API_URL}/notifications/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }),
  });

  return true;
}

/**
 * Fetch-based SSE (not EventSource) so we can stop on 401 and avoid
 * Chrome's infinite reconnect loop when the API is down or the JWT expired.
 *
 * Stream drops (hot reload, brief downtime) reconnect quietly — auth failures
 * call onError and stop. Browser may still log net::ERR_* for failed fetches;
 * that is expected while the API is restarting.
 */
export function connectNotificationStream(
  getAccessToken: () => string | null,
  onNotification: (notification: AppNotification) => void,
  onError?: () => void,
) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  /** Cap consecutive failures while offline; tab/network resume resets this. */
  const MAX_ATTEMPTS = 12;

  let closed = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = (reason: "soft" | "hard" = "soft") => {
    if (closed) return;
    if (attempt >= MAX_ATTEMPTS) {
      // Stop hammering; resume when network/tab comes back
      return;
    }
    // Soft (clean stream end / incomplete chunk): quick retry.
    // Hard (connection refused / 5xx): longer backoff.
    const base = reason === "hard" ? 2000 : 800;
    const delay = Math.min(base * 2 ** attempt, 45_000);
    attempt += 1;
    clearTimer();
    reconnectTimer = setTimeout(() => {
      void connect();
    }, delay);
  };

  const parseSseChunk = (chunk: string) => {
    const events = chunk.split("\n\n");
    for (const event of events) {
      if (!event.trim()) continue;
      const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      try {
        const data = JSON.parse(dataLine.slice(5).trim());
        if (data.type === "ping" || !data.id) continue;
        onNotification(data as AppNotification);
      } catch {
        // ignore malformed events
      }
    }
  };

  const connect = async () => {
    if (closed) return;
    clearTimer();
    controller?.abort();

    const accessToken = getAccessToken();
    if (!accessToken || isJwtExpired(accessToken)) {
      onError?.();
      return;
    }

    const url = `${API_URL}/notifications/stream?token=${encodeURIComponent(accessToken)}`;
    controller = new AbortController();

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        onError?.();
        return;
      }

      if (!res.ok || !res.body) {
        scheduleReconnect("hard");
        return;
      }

      attempt = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          parseSseChunk(part);
        }
      }

      // Server closed the stream (restart / idle proxy) — soft reconnect
      if (!closed) {
        scheduleReconnect("soft");
      }
    } catch (err) {
      if (closed) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Incomplete chunk / refused / network — soft or hard based on message
      const msg = err instanceof Error ? err.message : String(err);
      const hard =
        /Failed to fetch|NetworkError|Load failed|CONNECTION_REFUSED/i.test(msg);
      scheduleReconnect(hard ? "hard" : "soft");
    }
  };

  const resume = () => {
    if (closed) return;
    clearTimer();
    attempt = 0;
    void connect();
  };

  const onOnline = () => resume();
  const onVisible = () => {
    if (document.visibilityState === "visible") resume();
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);

  void connect();

  return () => {
    closed = true;
    clearTimer();
    controller?.abort();
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
