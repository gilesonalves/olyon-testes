import { Skeleton } from "@/components/ui/skeleton"

export default function AppointmentsPageSkeleton() {
  return (
    <div className="space-y-6 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f3f7ff_100%)] px-4 py-6 sm:px-6 sm:py-7">
      <div>
        <p className="text-sm font-medium text-slate-600">Carregando agendamentos...</p>
      </div>

      <section className="rounded-3xl border border-slate-300/80 bg-[linear-gradient(135deg,#f1f5f9_0%,#ffffff_38%,#eaf3ff_100%)] p-5 shadow-sm shadow-slate-200/70">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28 bg-slate-200" />
              <Skeleton className="h-8 w-64 bg-slate-200" />
              <Skeleton className="h-4 w-72 bg-slate-200" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[auto_220px_240px_auto]">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-11 w-28 rounded-xl bg-slate-200" />
                <Skeleton className="h-11 w-20 rounded-xl bg-slate-200" />
                <Skeleton className="h-11 w-28 rounded-xl bg-slate-200" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl bg-slate-200" />
              <Skeleton className="h-11 w-full rounded-xl bg-slate-200" />
              <Skeleton className="h-11 w-full rounded-xl bg-slate-200 xl:w-48" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-300/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="w-62 shrink-0 overflow-hidden rounded-[26px] border border-slate-300/80 bg-white/95 shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 bg-slate-200" />
                      <Skeleton className="h-3 w-16 bg-slate-200" />
                    </div>
                    <Skeleton className="size-8 rounded-full bg-slate-200" />
                  </div>
                </div>

                <div>
                  {Array.from({ length: 16 }, (_, rowIndex) => (
                    <div key={rowIndex} className="relative h-11 border-t border-slate-200 bg-white px-4 py-1.5">
                      <Skeleton className="h-3 w-10 bg-slate-200" />
                      {rowIndex === 6 ? <div className="mt-1 h-[90px] rounded-2xl bg-slate-100/80" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}