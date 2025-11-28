
export default function ItemNovo() {
  return (
    <div className="bg-white px-6 py-7">
      <div className="pb-6">
        <p>
          Entradas e Saidas
        </p>

      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="space-y-2 pb-6">
          <label className="block text-sm font-medium">
            Valor
          </label>
          <input
            id="value"
            name="value"
            type="number"
            placeholder="Digite aqui"
            className="w-full border border-gray-400 rounded px-3 py-1.5"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Valor
          </label>
          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option>Selecione a categoria</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Observações
        </label>
        <textarea
          placeholder="Descreva o evento"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <div className="text-right pt-8">
        <button type="submit" className="btn-segundary">Salvar</button>
      </div>



    </div>
  );
}
