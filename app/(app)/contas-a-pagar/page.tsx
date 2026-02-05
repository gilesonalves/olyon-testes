import Link from "next/link";

export default function ContasPagar() {
  return (
    <div className="bg-white px-6 py-7">

      <div className="flex justify-between items-center pb-6">
        <p>
          Contas a pagar
        </p>
        <Link href="/contas-a-pagar/novo" className="btn-segundary">
          Novo
        </Link>
      </div>

      <div className="py-6">
        <table className="min-w-full table-auto border border-gray-200 rounded-lg ">
          <thead className="text-left text-gray-600 text-sm hidden lg:table-header-group w-full bg-gray-50 border-b border-gray-300">
            <tr>
              <th scope="col"
                className="whitespace-nowrap px-6 py-3 text-left text-sm font-semibold">Valor</th>
              <th scope="col"
                className="whitespace-nowrap px-6 py-3 text-left text-sm font-semibold">Data</th>
              <th scope="col"
                className="whitespace-nowrap px-6 py-3 text-left text-sm font-semibold">Categoria</th>
              <th className="px-6 py-3"></th>
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

              <td className="whitespace-nowrap lg:px-6 lg:py-4 text-sm block lg:table-cell p-0 border-b lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Data</div>
                  <div className="text-sm p-4 lg:p-0">
                    00/00/00
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap lg:px-6 lg:py-4 text-sm block lg:table-cell p-0 lg:border-b-0">
                <div className="flex lg:justify-between items-center lg:border-b-0">
                  <div className="lg:hidden w-3/5 bg-gray-50 p-4 text-left text-sm font-semibold">Categoria</div>
                  <div className="text-sm p-4 lg:p-0 text-wrap">
                    pagamentos
                  </div>
                </div>
              </td>

              <td className="whitespace-nowrap text-center lg:text-right text-sm font-medium sm:pr-6">
                <div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="#0F172A" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </td>
            </tr>

          </tbody>
        </table>

      </div>

    </div>
  );
}
