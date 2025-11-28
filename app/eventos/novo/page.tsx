
export default function ItemNovo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#3D3F43]">
      <div className="w-full max-w-md rounded-xl bg-white px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Novo tipo de evento
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
              Descrição
            </label>
            <textarea
              placeholder="Descreva o evento"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Serviços
            </label>

            <div className="flex gap-2">
              <select className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                <option>Corte de cabelo</option>
                <option>Barba</option>
                <option>Corte + Barba</option>
              </select>
              <input
                type="number"
                placeholder="10 min"
                className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="text-right">
              <button type="button" className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                + Adicionar
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-800">
                    Corte de cabelo
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-2 text-xs font-medium text-slate-700">
                    30min
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <button type="button" className="cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.89904 2H3.29267C2.94362 2 2.60886 2.14048 2.36204 2.39052C2.11522 2.64057 1.97656 2.97971 1.97656 3.33333V12.6667C1.97656 13.0203 2.11522 13.3594 2.36204 13.6095C2.60886 13.8595 2.94362 14 3.29267 14H12.5054C12.8545 14 13.1892 13.8595 13.436 13.6095C13.6829 13.3594 13.8215 13.0203 13.8215 12.6667V8" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12.0956 1.75015C12.3574 1.48493 12.7124 1.33594 13.0826 1.33594C13.4529 1.33594 13.8079 1.48493 14.0697 1.75015C14.3315 2.01537 14.4786 2.37508 14.4786 2.75015C14.4786 3.12522 14.3315 3.48493 14.0697 3.75015L8.13869 9.75948C7.98243 9.91765 7.78939 10.0334 7.57737 10.0962L5.68678 10.6562C5.63015 10.6729 5.57013 10.6739 5.51299 10.6591C5.45585 10.6442 5.4037 10.6141 5.36199 10.5719C5.32029 10.5296 5.29056 10.4768 5.27592 10.4189C5.26128 10.361 5.26227 10.3002 5.27879 10.2428L5.83155 8.32748C5.89375 8.11285 6.00826 7.91752 6.16453 7.75948L12.0956 1.75015Z" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                  </button>
                  <button type="button" className="cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.57812 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.21094 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12.5018 4V13.3333C12.5018 13.687 12.3631 14.0261 12.1163 14.2761C11.8695 14.5262 11.5348 14.6667 11.1857 14.6667H4.60517C4.25612 14.6667 3.92136 14.5262 3.67454 14.2761C3.42772 14.0261 3.28906 13.687 3.28906 13.3333V4" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M1.97656 4H13.8215" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5.26562 4.0026V2.66927C5.26562 2.31565 5.40429 1.97651 5.6511 1.72646C5.89792 1.47641 6.23268 1.33594 6.58173 1.33594H9.21395C9.563 1.33594 9.89776 1.47641 10.1446 1.72646C10.3914 1.97651 10.5301 2.31565 10.5301 2.66927V4.0026" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                  </button>
                </div>
              </div>
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
