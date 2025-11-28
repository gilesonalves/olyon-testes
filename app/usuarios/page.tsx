
export default function Eventos() {
  return (
    <div className="bg-white px-6 py-7">
      <div className="flex justify-between items-center pb-6">
        <p>
          Usuários
        </p>
        <button type="submit" className="btn-segundary">Novo</button>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Jhonnatan
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 12L10 8L6 4" stroke="#0F172A" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
