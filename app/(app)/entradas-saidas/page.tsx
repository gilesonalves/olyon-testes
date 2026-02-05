import Link from "next/link";

export default function EntradasSaidas() {
  return (
    <div className="bg-white px-6 py-7">

      <div className="flex justify-between items-center pb-6">
        <p>
          Entradas e saídas
        </p>
        <Link href="/entradas-saidas/novo" className="btn-segundary">
          Novo
        </Link>
      </div>

      <div className="py-6">
        <table className="min-w-full table-auto border border-gray-200 rounded-lg ">
          <thead className="text-left text-gray-600 text-sm hidden lg:table-header-group w-full bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="whitespace-nowrap px-6 py-3.5 text-left text-sm font-semibold">Valor</th>
              <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Data</th>
              <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Vencimento</th>
              <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Tipo</th>
              <th className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold">Categoria</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            <tr className="border-b-2 lg:border-b border-gray-200">
              <td className="whitespace-nowrap lg:px-6 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Valor</div>
                  <div className="text-sm p-4 lg:p-0">
                    $10,00
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap lg:px-2 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Data</div>
                  <div className="text-sm p-4 lg:p-0">
                    00/00/00
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap lg:px-2 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Vencimento</div>
                  <div className="text-sm p-4 lg:p-0">
                    00/00/00
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap lg:px-2 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Tipo</div>
                  <div className="text-xs rounded-full ml-4 lg:ml-0 px-2 py-1">
                    contas
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap lg:px-2 lg:py-4 text-sm block lg:table-cell p-0 lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Categoria</div>
                  <div className="text-sm p-4 lg:p-0 text-wrap">
                    pagamentos
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap text-center lg:text-right text-sm font-medium sm:pr-6">
                <div className="flex items-center gap-2">
                  <button type="button" className="cursor-pointer">
                    <svg width="16" viewBox="0 0 512 512">
                      <path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l82.7 0-201.4 201.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3 448 192c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160c0-17.7-14.3-32-32-32L320 0zM80 96C35.8 96 0 131.8 0 176L0 432c0 44.2 35.8 80 80 80l256 0c44.2 0 80-35.8 80-80l0-80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 80c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l80 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 96z" />
                    </svg>
                  </button>
                  <button type="button" className="cursor-pointer">
                    <svg width="16" viewBox="0 0 576 512">
                      <path d="M419.5 96c-16.6 0-32.7 4.5-46.8 12.7-15.8-16-34.2-29.4-54.5-39.5 28.2-24 64.1-37.2 101.3-37.2 86.4 0 156.5 70 156.5 156.5 0 41.5-16.5 81.3-45.8 110.6l-71.1 71.1c-29.3 29.3-69.1 45.8-110.6 45.8-86.4 0-156.5-70-156.5-156.5 0-1.5 0-3 .1-4.5 .5-17.7 15.2-31.6 32.9-31.1s31.6 15.2 31.1 32.9c0 .9 0 1.8 0 2.6 0 51.1 41.4 92.5 92.5 92.5 24.5 0 48-9.7 65.4-27.1l71.1-71.1c17.3-17.3 27.1-40.9 27.1-65.4 0-51.1-41.4-92.5-92.5-92.5zM275.2 173.3c-1.9-.8-3.8-1.9-5.5-3.1-12.6-6.5-27-10.2-42.1-10.2-24.5 0-48 9.7-65.4 27.1L91.1 258.2c-17.3 17.3-27.1 40.9-27.1 65.4 0 51.1 41.4 92.5 92.5 92.5 16.5 0 32.6-4.4 46.7-12.6 15.8 16 34.2 29.4 54.6 39.5-28.2 23.9-64 37.2-101.3 37.2-86.4 0-156.5-70-156.5-156.5 0-41.5 16.5-81.3 45.8-110.6l71.1-71.1c29.3-29.3 69.1-45.8 110.6-45.8 86.6 0 156.5 70.6 156.5 156.9 0 1.3 0 2.6 0 3.9-.4 17.7-15.1 31.6-32.8 31.2s-31.6-15.1-31.2-32.8c0-.8 0-1.5 0-2.3 0-33.7-18-63.3-44.8-79.6z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

          </tbody>
        </table>

      </div>

    </div>
  );
}
