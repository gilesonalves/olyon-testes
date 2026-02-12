import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
}

export default function DashboardCard({
  title,
  actionLabel,
  actionHref,
  children,
}: DashboardCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
