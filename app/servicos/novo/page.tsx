
export default function ItemNovo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#3D3F43]">
      <div className="w-full max-w-md rounded-xl bg-white px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Novo serviço
        </h2>

        <div className="space-y-4">

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="nome"
              name="name"
              type="text"
              placeholder="Digite aqui o nome"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Duração
            </label>

            <div className="flex gap-2">
              <select className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                <option>10min</option>
                <option>20min</option>
                <option>30min</option>
              </select>
              
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Fechar
            </button>
            <button type="submit" className="btn-segundary">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
