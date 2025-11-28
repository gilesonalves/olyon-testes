
export default function RecuperarSenha() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center pb-6">
          <picture>
            <img className="block mx-auto pb-4"
              src="/imagens/logo-login.svg"
              alt=""
            />
          </picture>
          <h2 className="text-2xl text-center font-semibold">
            Recuperação de senha
          </h2>
        </div>

        <div>
          <div className="space-y-2 pb-6">
            <label className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Digite aqui seu email"
              className="w-full border border-gray-400 rounded px-3 py-2"
              required
            />
          </div>

          
          <button type="submit" className="btn-primary mt-4">Recuperar</button>
        </div>
      </div>
    </div>
  );
}
