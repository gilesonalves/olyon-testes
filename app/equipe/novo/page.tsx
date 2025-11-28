
export default function ItemNovo() {
  return (
    <div className="bg-white px-6 py-7">
      <div className="pb-6">
        <p>
          Equipe
        </p>
        
      </div>
      <div className="space-y-2 pb-6">
        <label className="block text-sm font-medium">
          Nome
        </label>
        <input
          id="nome"
          name="name"
          type="text"
          placeholder="Digite aqui o nome"
          className="w-full border border-gray-400 rounded px-3 py-2"
          required
        />
      </div>
      <div className="flex gap-10">
        <p className="text-sm font-medium text-gray-900">
          Jhonnatan Soares
        </p>
        <p className="text-sm font-medium text-gray-900">
          Jhonnatan Soares
        </p>
        <p className="text-sm font-medium text-gray-900">
          Jhonnatan Soares
        </p>
      </div>
      <div className="text-right pt-8">
        <button type="submit" className="btn-segundary">Salvar</button>
      </div>



    </div>
  );
}
