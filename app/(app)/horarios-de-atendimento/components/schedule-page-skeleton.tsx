import { Skeleton } from "@/components/ui/skeleton"

function WeeklyDaySkeleton() {
  return (
    <div className="mb-3 space-y-3 rounded-xl border border-slate-300/80 bg-white/95 p-4 shadow-sm shadow-slate-200/70">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 bg-slate-200" />
          <Skeleton className="h-4 w-44 bg-slate-200" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full bg-slate-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[40px_96px_96px_16px_96px_28px] sm:items-center">
        <Skeleton className="h-4 w-4 rounded bg-slate-200" />
        <Skeleton className="h-10 w-full rounded-lg bg-slate-200" />
        <Skeleton className="h-10 w-full rounded-lg bg-slate-200" />
        <Skeleton className="hidden h-4 w-4 rounded bg-slate-200 sm:block" />
        <Skeleton className="h-10 w-full rounded-lg bg-slate-200" />
        <Skeleton className="h-8 w-8 rounded-lg bg-slate-200" />
      </div>
    </div>
  )
}

export function SchedulePageSkeleton() {
  return (
    <div className="w-full max-w-5xl bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f3f7ff_100%)] px-4 py-6 sm:px-6 sm:py-7">
      <div className="mb-5">
        <p className="text-sm font-medium text-slate-600">Carregando horários de atendimento...</p>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, index) => (
          <WeeklyDaySkeleton key={index} />
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Skeleton className="h-10 w-24 rounded-xl bg-slate-200" />
        <Skeleton className="h-10 w-44 rounded-xl bg-slate-200" />
      </div>

      <div className="pt-10 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-40 bg-slate-200" />
          <Skeleton className="h-9 w-28 rounded-lg bg-slate-200" />
        </div>

        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-lg border border-slate-300/80 bg-white/95 px-3 py-3 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-slate-200" />
              <Skeleton className="h-3 w-32 bg-slate-200" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-4 w-12 bg-slate-200" />
              <Skeleton className="h-4 w-14 bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BlockedScheduleListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border border-slate-300/80 bg-white/95 px-3 py-3 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 bg-slate-200" />
            <Skeleton className="h-3 w-32 bg-slate-200" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-4 w-12 bg-slate-200" />
            <Skeleton className="h-4 w-14 bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}