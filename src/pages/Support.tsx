import { Link } from "react-router-dom"
import { Mail, ShieldCheck, Trash2, FileText, ArrowLeft, Smartphone } from "lucide-react"

export default function Support() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-12 md:py-16">
      <article className="max-w-4xl mx-auto space-y-7">
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 font-semibold hover:text-indigo-300">
          <ArrowLeft size={18} />
          Voltar ao NexJud
        </Link>

        <section className="rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12">
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2">Suporte</h1>
          <p className="text-gray-400 mt-4 text-lg leading-8">
            Atendimento para usuários do NexJud Workspace e do NexJud Companion.
          </p>

          <div className="mt-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6">
            <div className="flex items-start gap-4">
              <Mail className="text-indigo-400 shrink-0 mt-1" size={26} />
              <div>
                <h2 className="text-xl font-bold">Fale com o suporte</h2>
                <p className="text-gray-300 mt-2 leading-7">
                  Para dúvidas sobre acesso, conta, documentos, casos, assinatura ou funcionamento do aplicativo,
                  envie um e-mail para <strong>suporte@nexjud.com.br</strong>.
                </p>
                <a
                  href="mailto:suporte@nexjud.com.br?subject=Suporte%20NexJud"
                  className="inline-flex mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold hover:bg-indigo-500"
                >
                  Enviar e-mail ao suporte
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-5">
          <Link
            to="/privacy"
            className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6 hover:border-indigo-500/40 transition-colors"
          >
            <ShieldCheck className="text-indigo-400" size={28} />
            <h2 className="text-xl font-bold mt-4">Política de Privacidade</h2>
            <p className="text-gray-400 mt-2 leading-7">
              Consulte como dados pessoais, documentos e informações de casos são tratados no NexJud.
            </p>
          </Link>

          <Link
            to="/terms"
            className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6 hover:border-indigo-500/40 transition-colors"
          >
            <FileText className="text-indigo-400" size={28} />
            <h2 className="text-xl font-bold mt-4">Termos de Uso</h2>
            <p className="text-gray-400 mt-2 leading-7">
              Consulte as regras de uso do NexJud Workspace e do NexJud Companion.
            </p>
          </Link>

          <Link
            to="/account-deletion"
            className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6 hover:border-red-500/40 transition-colors"
          >
            <Trash2 className="text-red-400" size={28} />
            <h2 className="text-xl font-bold mt-4">Excluir conta e dados</h2>
            <p className="text-gray-400 mt-2 leading-7">
              Veja como solicitar a exclusão da sua conta e dos dados associados.
            </p>
          </Link>

          <Link
            to="/companion"
            className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6 hover:border-indigo-500/40 transition-colors"
          >
            <Smartphone className="text-indigo-400" size={28} />
            <h2 className="text-xl font-bold mt-4">NexJud Companion</h2>
            <p className="text-gray-400 mt-2 leading-7">
              Conheça o aplicativo móvel conectado ao mesmo ecossistema do NexJud Workspace.
            </p>
          </Link>
        </section>

        <section className="rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-10">
          <h2 className="text-2xl font-bold">Sobre o NexJud</h2>
          <p className="text-gray-300 leading-7 mt-3">
            O NexJud é uma plataforma tecnológica de apoio à atividade jurídica. O Workspace e o Companion
            permitem organizar casos e documentos e utilizar recursos de inteligência jurídica. Análises,
            resumos, minutas, pesquisas e sugestões devem ser revisadas pelo profissional responsável.
          </p>
        </section>
      </article>
    </main>
  )
}
