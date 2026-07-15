"use client";

import { useEffect } from "react";
import { reportToAdmin } from "@/lib/report";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportToAdmin({
      type: "page_error",
      message: `${error.message}${error.digest ? ` (digest: ${error.digest})` : ""}`,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-bold text-primary">Sahifa yuklanmadi</h2>
      <p className="max-w-sm text-sm text-muted">
        Kutilmagan xatolik yuz berdi. Bizga xabar yuborildi — qayta urinib
        ko&apos;ring.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white"
      >
        Qayta urinish
      </button>
    </div>
  );
}
