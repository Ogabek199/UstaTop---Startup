"use client";

import { useEffect } from "react";
import { reportToAdmin } from "@/lib/report";

export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message =
        event.message ||
        (event.error instanceof Error ? event.error.message : "Unknown error");
      reportToAdmin({
        type: "error",
        message: message.slice(0, 2000),
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      reportToAdmin({
        type: "error",
        message: message.slice(0, 2000),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
