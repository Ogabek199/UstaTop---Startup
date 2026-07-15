import { Suspense } from "react";

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="p-5">...</div>}>{children}</Suspense>;
}
