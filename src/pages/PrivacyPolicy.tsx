import { Link } from "react-router-dom"

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-16">
      <article className="max-w-4xl mx-auto rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12 space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>
        <div>
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Política de Privacidade</h1>
          <p className="text-gray-400 mt-3">Última atualização: 1º de agosto de 2026.</p>
        </div>

        <Section title="1. Escopo">
          Esta política explica como o NexJud Workspace e o NexJud Companion tratam dados pessoais, documentos jurídicos, informações de casos e dados técnicos necessários ao funcionamento da plataforma.
        </Section>
        <Section title="2. Dados tratados">
          Podemos tratar dados de cadastro e autenticação, informações inseridas pelo usuário, documentos enviados, dados de casos e processos, histórico de uso, registros de segurança e informações de assinatura. O usuário deve possuir base legal e autorização para inserir dados de terceiros na plataforma.
        </Section>
        <Section title="3. Finalidades">
          Os dados são utilizados para autenticação, sincronização entre Web e aplicativo, armazenamento e organização de documentos, execução das funcionalidades de inteligência artificial, suporte, segurança, prevenção de fraude, faturamento e melhoria do serviço.
        </Section>
        <Section title="4. Inteligência artificial">
          Conteúdos enviados podem ser processados por modelos de inteligência artificial para gerar análises, resumos, estratégias e documentos solicitados pelo usuário. O NexJud é ferramenta de apoio; a revisão e a decisão jurídica final permanecem sob responsabilidade do profissional.
        </Section>
        <Section title="5. Compartilhamento e operadores">
          Dados podem ser processados por provedores de infraestrutura, banco de dados, armazenamento, autenticação, inteligência artificial, pagamentos, e-mail e monitoramento, sempre de acordo com contratos e medidas de segurança aplicáveis.
        </Section>
        <Section title="6. Segurança e retenção">
          Aplicamos controles de acesso, autenticação, comunicação criptografada, políticas de banco e segregação por usuário. Os dados são mantidos pelo período necessário à prestação do serviço, ao cumprimento de obrigações legais e à defesa de direitos.
        </Section>
        <Section title="7. Direitos do titular">
          O titular pode solicitar confirmação, acesso, correção, portabilidade, informações sobre compartilhamento, revogação de consentimento quando aplicável e exclusão, observadas as hipóteses legais de conservação.
        </Section>
        <Section title="8. Exclusão da conta">
          O usuário pode solicitar a exclusão da conta e dos dados pela página pública de exclusão. A solicitação será validada antes da remoção definitiva e poderá preservar registros exigidos por lei ou necessários à defesa de direitos.
        </Section>
        <Section title="9. Contato">
          Para assuntos de privacidade e proteção de dados, entre em contato pelo e-mail suporte@nexjud.com.br.
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
