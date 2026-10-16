import { Link } from "react-router-dom"

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-16">
      <article className="max-w-4xl mx-auto rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12 space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>
        <div>
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Política de Privacidade</h1>
          <p className="text-gray-400 mt-3">Última atualização: 16 de outubro de 2026.</p>
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
        <Section title="4. Inteligência artificial e fornecedor externo">
          Para executar funcionalidades de IA solicitadas pelo usuário, a NexJud pode enviar à OpenAI (OpenAI, L.L.C., provedora externa de modelos de IA) o texto enviado, perguntas, histórico relevante de conversas, dados processuais, fatos dos casos, informações das partes e trechos de documentos vinculados, conforme o contexto selecionado e a função utilizada. Esses conteúdos podem incluir dados pessoais de terceiros. A transmissão ocorre por funções de servidor da NexJud, não por conexão direta do aplicativo à OpenAI.
          No aplicativo iOS, o usuário recebe aviso específico e precisa autorizar expressamente antes do primeiro envio à IA; sem essa autorização, as funções com transmissão externa não são executadas. O usuário pode revogar a autorização em Perfil, impedindo novos envios, sem excluir automaticamente dados já processados. O NexJud é ferramenta de apoio e exige revisão profissional dos resultados.
        </Section>
        <Section title="5. Compartilhamento e operadores">
          Usamos infraestrutura Supabase para autenticação, banco de dados, armazenamento e funções servidor; OpenAI para o processamento externo de IA descrito acima; e outros operadores necessários a pagamentos, suporte, e-mail e monitoramento. Compartilhamos apenas informações relacionadas ao serviço solicitado e adotamos controles técnicos, contratuais e organizacionais para exigir proteção apropriada de fornecedores externos. O uso efetivo e os termos de proteção de cada fornecedor precisam ser verificados periodicamente.
        </Section>
        <Section title="6. Segurança e retenção">
          Aplicamos controles de acesso, autenticação, comunicação criptografada, políticas de banco e segregação por usuário. Os dados são mantidos pelo período necessário à prestação do serviço, ao cumprimento de obrigações legais e à defesa de direitos.
        </Section>
        <Section title="7. Direitos do titular">
          O titular pode solicitar confirmação, acesso, correção, portabilidade, informações sobre compartilhamento, revogação de consentimento quando aplicável e exclusão, observadas as hipóteses legais de conservação. No aplicativo iOS, a permissão para futuros envios à OpenAI pode ser revogada em Perfil. Solicitações sobre histórico, retenção e exclusão também podem ser enviadas a suporte@nexjud.com.br.
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
