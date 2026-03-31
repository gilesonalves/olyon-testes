import HeaderPage from "@/components/headerPage"
import CalendarLab from "./components/calendar-lab"

export default function AgendamentosLabPage() {
  return (
    <>
      <HeaderPage>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-950">Agendamentos Lab</h1>
          <p className="text-sm text-slate-500">
            POC isolada do FullCalendar para validar layout e renderizacao sem mexer na tela
            oficial de agendamentos.
          </p>
        </div>
      </HeaderPage>

      <main className="min-h-[calc(100vh-4rem)] bg-slate-50/60 p-4 md:p-6">
        <div className="mx-auto max-w-[1600px]">
          <CalendarLab />
        </div>
      </main>
    </>
  )
}
