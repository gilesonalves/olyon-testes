
export default function EntradasSaidas() {
  return (
    <div className="bg-white px-6 py-7">

      <div className="flex justify-between items-center pb-6">
        <p>
          Controle de Pagamentos
        </p>
        <button type="submit" className="btn-segundary">Novo</button>
      </div>
      <div className="pb-2 space-y-3">
        <label className="block text-sm font-medium mb-1">Filtrar por data</label>
        <div className="flex items-center gap-2 lg:gap-4">
          <input
            type="search"
            placeholder="Digite seu aqui"
            className="max-w-full w-64 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.5">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#0F172A" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.0016 14.0016L11.1016 11.1016" stroke="#0F172A" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>

        </div>
      </div>
      <div className="py-6">
        <table className="min-w-full table-auto border border-gray-200 rounded-lg ">
          <thead className="text-left text-gray-600 text-sm hidden lg:table-header-group w-full bg-gray-50 border-b border-gray-300">
            <tr>
              <th colSpan={3} className="whitespace-nowrap px-6 py-3.5 text-left text-sm font-semibold">Nome</th>
              <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            <tr className="border-b-2 lg:border-b border-gray-200">
              <td colSpan={3} className="whitespace-nowrap lg:px-6 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Nome</div>
                  <div className="text-sm p-4 lg:p-0">
                    $10,00
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap lg:px-2 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Valor</div>
                  <div className="text-sm p-4 lg:p-0">
                    00/00/00
                  </div>
                </div>
              </td>


            </tr>

          </tbody>
        </table>

      </div>

    </div>
  );
}
