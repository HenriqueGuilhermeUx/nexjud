import { Link } from "react-router-dom"

export default function DataDeletion() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-16">
      <article className="max-w-3xl mx-auto rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12 space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>

        <div>
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Exclusão de dados pessoais</h1>
          <p className="text-gray-400 mt-3">Solicitação válida para o NexJud Workspace e o NexJud Companion.</p>
        </div>

        <section>
          <h2 className="text-xl font-bold">Solicitar exclusão sem encerrar a conta</h2>
          <p className="text-gray-300 leading-7 mt-2">
            Você pode solicitar a exclusão de documentos, casos, conversas, memórias, arquivos ou outros dados específicos, sem necessariamente excluir toda a conta NexJud.
          </p>
        </section>

        <section className="rounded-2xl border border-[#334155] bg-[#0f172a] p-6">
          <h2 className="text-xl font-bold">Como solicitar</h2>
          <ol className="text-gray-300 leading-7 mt-3 list-decimal pl-6 space-y-2">
            <li>Envie o pedido a partir do e-mail cadastrado na conta.</li>
            <li>Use o assunto “Exclusão de dados NexJud”.</li>
            <li>Informe quais dados deseja excluir.</li>
            <li>Envie para <strong>suporte@nexjud.com.br</strong>.</li>
          </ol>

          <a
            href="mailto:suporte@nexjud.com.br?subject=Exclus%C3%A3o%20de%20dados%20NexJud&body=Nome%20completo%3A%0AE-mail%20da%20conta%3A%0ADados%20que%20desejo%20excluir%3A%0A"
            className="inline-flex mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-bold hover:bg-indigo-500"
          >
            Solicitar exclusão de dados
          </a>
        </section>

        <section>
          <h2 className="text-xl font-bold">Dados que podem ser excluídos</h2>
          <p className="text-gray-300 leading-7 mt-2">
            Documentos enviados, arquivos armazenados, casos, conversas com a IA, sessões, memórias jurídicas, jurisprudências salvas, precedentes, registros de tarefas e demais conteúdos associados ao usuário, observadas as exceções legais.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Prazo, validação e retenção legal</h2>
          <p className="text-gray-300 leading-7 mt-2">
            A identidade do solicitante será validada antes da exclusão. O pedido será processado em prazo razoável. Dados poderão ser mantidos quando necessários ao cumprimento de obrigação legal, prevenção de fraude, segurança, faturamento ou exercício regular de direitos.
          </p>
        </section>

        <section className="border-t border-[#1e293b] pt-6">
          <p className="text-gray-400">
            Para encerrar completamente a conta, acesse a página de <Link to="/account-deletion" className="text-indigo-400 font-semibold">exclusão da conta e dos dados</Link>.
          </p>
        </section>
      </article>
    </main>
  )
}
