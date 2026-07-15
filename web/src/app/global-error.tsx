"use client";

import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch(`${API_URL}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "page_error",
        message: `Global: ${error.message}${
          error.digest ? ` (${error.digest})` : ""
        }`,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="uz">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Ilova ishlamayapti</h2>
          <p style={{ maxWidth: 320, fontSize: 14, color: "#666" }}>
            Jiddiy xatolik yuz berdi. Bizga xabar yuborildi.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: 12,
              background: "#1F4E5F",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
