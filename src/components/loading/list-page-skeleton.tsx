import { Skeleton } from "@/components/ui/skeleton"

type ListPageSkeletonProps = {
  message: string
  showAction?: boolean
  rows?: number
}

export default function ListPageSkeleton({
  message,
  showAction = true,
  rows = 6,
}: ListPageSkeletonProps) {
  return (
    <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f3f7ff_100%)] px-6 py-7">
      <div className="mb-5">
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>

      <section className="rounded-3xl border border-slate-300/80 bg-[linear-gradient(135deg,#f1f5f9_0%,#ffffff_40%,#edf5ff_100%)] p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28 bg-slate-200" />
            <Skeleton className="h-8 w-56 bg-slate-200" />
            <Skeleton className="h-4 w-44 bg-slate-200" />
          </div>

          {showAction ? <Skeleton className="h-10 w-32 rounded-xl bg-slate-200" /> : null}
        </div>
      </section>

      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl border border-slate-300/80 bg-white/95 px-4 py-4 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-44 bg-slate-200" />
              <Skeleton className="h-3 w-72 max-w-full bg-slate-200" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-xl bg-slate-200" />
              <Skeleton className="h-9 w-24 rounded-xl bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}