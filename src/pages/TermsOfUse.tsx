import { Link } from "react-router-dom"

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-16">
      <article className="max-w-4xl mx-auto rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12 space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>
        <div>
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Termos de Uso</h1>
          <p className="text-gray-400 mt-3">Última atualização: 1º de agosto de 2026.</p>
        </div>

        <Section title="1. Aceitação">
          Ao criar uma conta ou utilizar o NexJud Workspace e o NexJud Companion, o usuário declara ter capacidade para contratar e concorda com estes termos e com a Política de Privacidade.
        </Section>
        <Section title="2. Natureza do serviço">
          O NexJud é uma plataforma tecnológica de apoio à atividade jurídica. As respostas, análises, minutas, pesquisas, indicadores e sugestões produzidos não substituem a avaliação profissional, a conferência dos autos nem a decisão jurídica do usuário.
        </Section>
        <Section title="3. Conta e segurança">
          O usuário é responsável pela veracidade dos dados cadastrados, pela guarda de suas credenciais e por todas as atividades realizadas em sua conta. O compartilhamento indevido de acesso pode resultar em suspensão preventiva.
        </Section>
        <Section title="4. Conteúdo do usuário">
          O usuário mantém os direitos sobre os conteúdos enviados e declara possuir autorização e base legal para tratar dados pessoais, documentos sigilosos e informações de terceiros. É proibido inserir conteúdo ilícito ou utilizar a plataforma para violar direitos.
        </Section>
        <Section title="5. Uso de inteligência artificial">
          Sistemas de inteligência artificial podem produzir respostas incompletas ou imprecisas. O usuário deve revisar fatos, fundamentos, citações, prazos, cálculos, jurisprudência e documentos antes de qualquer utilização profissional ou protocolo.
        </Section>
        <Section title="6. Planos e trial">
          Funcionalidades podem variar conforme o plano contratado. O trial possui duração indicada na oferta e pode ser encerrado ou limitado em caso de abuso, fraude ou uso incompatível com estes termos.
        </Section>
        <Section title="7. Disponibilidade">
          Buscamos manter o serviço disponível, mas podem ocorrer manutenções, falhas de terceiros, indisponibilidades de internet e eventos fora do nosso controle. Funcionalidades experimentais podem ser alteradas ou removidas.
        </Section>
        <Section title="8. Responsabilidades">
          O usuário é responsável pelas decisões tomadas com apoio da plataforma, pelo cumprimento de prazos, pela confidencialidade profissional e pela adequação do uso às normas da OAB e à legislação aplicável.
        </Section>
        <Section title="9. Suspensão e encerramento">
          Contas podem ser suspensas em caso de violação destes termos, risco de segurança, fraude, inadimplência ou ordem legal. O usuário pode solicitar o encerramento e a exclusão por meio da página pública correspondente.
        </Section>
        <Section title="10. Contato">
          Dúvidas sobre estes termos podem ser encaminhadas para suporte@nexjud.com.br.
        </Section>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-gray-300 leading-7 mt-2">{children}</p>
    </section>
  )
}
