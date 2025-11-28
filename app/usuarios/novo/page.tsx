
export default function ItemNovo() {
  return (
    <div className="bg-white px-6 py-7">
      <div className="flex justify-between items-center pb-6">
        <p>
          Usuários
        </p>
        <button type="submit" className="btn-segundary">Novo</button>
      </div>
      <div className="grid grid-cols-2 gap-6">
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
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Digite aqui o email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Digite aqui a senha"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Cargo
            </label>
            <input
              id="position"
              name="position"
              type="text"
              placeholder="Digite aqui o nome"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
      </div>

    </div>
  );
}
