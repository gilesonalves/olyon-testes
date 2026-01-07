import HeaderPage from "@/components/headerPage";
import Link from "next/link";

export default function Equipe() {
  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Equipe</span>
          <Link href="/equipe/novo" className="btn-segundary">
            Novo
          </Link>
        </div>
      </HeaderPage>
      <div className="bg-white px-6 py-7">

        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-medium text-gray-900">
                Jhonnatan Soares
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">

              <div className="flex items-center gap-2">
                <button type="submit" className="btn-segundary">Editar</button>
                <button type="submit" className="btn-delete">Cancelar</button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
