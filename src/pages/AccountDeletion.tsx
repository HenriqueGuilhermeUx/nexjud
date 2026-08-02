import { Link } from "react-router-dom"

export default function AccountDeletion() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-16">
      <article className="max-w-3xl mx-auto rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12 space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>
        <div>
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Exclusão da conta e dos dados</h1>
          <p className="text-gray-400 mt-3">Solicitação válida para o NexJud Workspace e o NexJud Companion.</p>
        </div>

        <section className="rounded-2xl border border-[#334155] bg-[#0f172a] p-6">
          <h2 className="text-xl font-bold">Como solicitar</h2>
          <ol className="text-gray-300 leading-7 mt-3 list-decimal pl-6 space-y-2">
            <li>Envie um e-mail a partir do endereço cadastrado na conta.</li>
            <li>Use o assunto “Exclusão de conta NexJud”.</li>
            <li>Informe o nome completo e o e-mail da conta.</li>
            <li>Envie para <strong>suporte@nexjud.com.br</strong>.</li>
          </ol>
          <a
            href="mailto:suporte@nexjud.com.br?subject=Exclus%C3%A3o%20de%20conta%20NexJud&body=Nome%20completo%3A%0AE-mail%20da%20conta%3A%0AConfirmo%20que%20desejo%20excluir%20minha%20conta%20NexJud%20e%20os%20dados%20associados."
            className="inline-flex mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-bold hover:bg-indigo-500"
          >
            Solicitar exclusão por e-mail
          </a>
        </section>

        <section>
          <h2 className="text-xl font-bold">O que será excluído</h2>
          <p className="text-gray-300 leading-7 mt-2">
            Após a validação da identidade, serão excluídos ou anonimizados, conforme aplicável, o perfil, sessões, documentos, casos, conversas, memórias, jurisprudências, precedentes e demais dados associados à conta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Prazo e exceções</h2>
          <p className="text-gray-300 leading-7 mt-2">
            A solicitação será processada em prazo razoável após a confirmação. Determinados registros poderão ser preservados quando exigidos por lei, necessários à prevenção de fraude, ao cumprimento de obrigações ou à defesa de direitos.
          </p>
        </section>
      </article>
    </main>
  )
}
