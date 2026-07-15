import { Suspense } from "react";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="p-5">...</div>}>{children}</Suspense>;
}
