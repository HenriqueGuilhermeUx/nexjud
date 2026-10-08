import { Link } from "react-router-dom"

export default function Support() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-16">
      <article className="max-w-3xl mx-auto rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12 space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>

        <div>
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Suporte</h1>
          <p className="text-gray-400 mt-3">
            Atendimento para usuários do NexJud Workspace e do NexJud Companion.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-bold">Fale com o suporte</h2>
          <p className="text-gray-300 leading-7 mt-2">
            Para dúvidas sobre acesso, conta, documentos, casos, assinatura ou funcionamento do aplicativo,
            envie um e-mail para <strong>suporte@nexjud.com.br</strong>.
          </p>
          <a
            href="mailto:suporte@nexjud.com.br?subject=Suporte%20NexJud"
            className="inline-flex mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold hover:bg-indigo-500"
          >
            Enviar e-mail ao suporte
          </a>
        </section>

        <section className="rounded-2xl border border-[#334155] bg-[#0f172a] p-6 space-y-3">
          <h2 className="text-xl font-bold">Privacidade e conta</h2>
          <div><Link to="/privacy" className="text-indigo-300 hover:text-indigo-200">Política de Privacidade</Link></div>
          <div><Link to="/terms" className="text-indigo-300 hover:text-indigo-200">Termos de Uso</Link></div>
          <div><Link to="/account-deletion" className="text-indigo-300 hover:text-indigo-200">Excluir conta e dados</Link></div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Sobre o aplicativo</h2>
          <p className="text-gray-300 leading-7 mt-2">
            O NexJud Companion conecta o profissional ao mesmo ecossistema do NexJud Workspace,
            com acesso a casos, documentos, agenda e funcionalidades de inteligência jurídica.
            O NexJud é ferramenta de apoio e não substitui a revisão profissional.
          </p>
        </section>
      </article>
    </main>
  )
}
