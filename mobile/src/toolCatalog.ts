// Catálogo único de ferramentas do NexJud.
// Fonte da verdade para a web (Dashboard), o PWA (/app) e o app (mobile).
// O app tem uma cópia idêntica em mobile/src/toolCatalog.ts; o teste
// src/navigation/toolCatalog.test.ts falha se as duas cópias divergirem.
// Para atualizar: edite este arquivo e rode `node scripts/sync-tool-catalog.mjs`.

export type ToolIcon =
  | "target"
  | "brain"
  | "file"
  | "sparkles"
  | "archive"
  | "wand"
  | "bell"
  | "database"
  | "history"
  | "gavel"
  | "shield"
  | "search"
  | "scale"

export type ToolGroupId = "analisar" | "produzir" | "gerenciar" | "pesquisa" | "estrategia"

export type Tool = {
  path: string
  label: string
  description: string
  icon: ToolIcon
  badge?: string
}

export type ToolGroup = {
  id: ToolGroupId
  label: string
  tools: readonly Tool[]
}

// Mensagem central do produto (home do site, tela inicial, app e marketing).
export const NEXJUD_PROMISE = {
  headline: "A IA jurídica que conhece o seu processo e o seu juiz.",
  subline: "IA genérica responde sobre Direito. O NexJud lê os seus processos e as decisões reais da sua vara em fontes oficiais, avisa o que mudou, sugere a tese e escreve a peça — com o link de cada decisão que usa.",
} as const

// As três portas da tela inicial (web, PWA e app). O resto fica em "Mais ferramentas".
export const PRIMARY_DOORS: readonly Tool[] = [
  { path: "/dashboard/meus-processos", label: "Meus processos", description: "O que mudou em cada processo, explicado em português simples e com o próximo passo.", icon: "database" },
  { path: "/dashboard/decision-intelligence", label: "Estratégia do caso", description: "Como o juízo do seu processo tem decidido e três teses sugeridas, com as decisões que as sustentam.", icon: "target" },
  { path: "/dashboard/draft-generator", label: "Escrever peça", description: "Petição com a tese escolhida e decisões reais da própria vara, sem jurisprudência inventada.", icon: "wand" },
] as const

export const TOOL_GROUPS: readonly ToolGroup[] = [
  {
    id: "analisar",
    label: "Analisar",
    tools: [
      { path: "/dashboard/decision-intelligence", label: "DNA do Juiz — IA Preditiva", description: "Argumentos, provas, histórico e estratégia para o caso.", icon: "target", badge: "DESTAQUE" },
      { path: "/dashboard/legal-chat", label: "Conversar com a IA", description: "Tire dúvidas jurídicas usando seus documentos e casos.", icon: "brain" },
      { path: "/dashboard/knowledge-base", label: "Analisar documentos", description: "Envie contratos, estatutos, atas, PDFs, DOCX e imagens.", icon: "file" },
      { path: "/dashboard/ai-copilot", label: "Analisar um processo", description: "Aprofunde riscos, estratégia e próximos passos com o AI Copilot.", icon: "sparkles" },
      { path: "/dashboard/process-check", label: "Verificar processo", description: "Fase, órgão julgador e última movimentação pelo número CNJ.", icon: "search" },
      { path: "/dashboard/cnj-processes", label: "Processos CNJ", description: "Movimentações, classe e contexto processual salvos.", icon: "gavel" },
      { path: "/dashboard/legal-memory", label: "Biblioteca Inteligente", description: "Salve teses, aprendizados e conhecimento do escritório.", icon: "archive" },
    ],
  },
  {
    id: "produzir",
    label: "Produzir",
    tools: [
      { path: "/dashboard/draft-generator", label: "Criar petição ou contrato", description: "Gere peças, contratos, notificações e minutas com IA.", icon: "wand" },
      { path: "/dashboard/draft-history", label: "Documentos criados", description: "Revise e reutilize peças anteriores.", icon: "archive" },
      { path: "/dashboard/reports", label: "Relatórios", description: "Prepare relatórios para clientes, sócios e reuniões.", icon: "file" },
    ],
  },
  {
    id: "gerenciar",
    label: "Gerenciar",
    tools: [
      { path: "/dashboard/office-intelligence", label: "Office Intelligence", description: "Morning Brief, riscos, prioridades e memória do escritório.", icon: "sparkles" },
      { path: "/dashboard/notifications", label: "Central de Alertas", description: "Movimentações, riscos e ações que exigem atenção.", icon: "bell" },
      { path: "/dashboard/meus-processos", label: "Meus processos", description: "Novidades de cada processo, com o próximo passo.", icon: "bell" },
      { path: "/dashboard/legal-cases", label: "Casos e clientes", description: "Organize clientes, processos, riscos e estratégia.", icon: "database" },
      { path: "/dashboard/visao-geral", label: "Visão geral do escritório", description: "O painel completo com indicadores e atalhos.", icon: "sparkles" },
      { path: "/dashboard/live-dossier", label: "Dossiê vivo", description: "Fatos, provas, riscos e próximos passos de cada caso.", icon: "scale" },
      { path: "/dashboard/process-portfolio", label: "Carteira de processos", description: "Visualize todos os casos em andamento.", icon: "database" },
      { path: "/dashboard/history", label: "Histórico", description: "Veja tudo que já foi feito na plataforma.", icon: "history" },
      { path: "/dashboard/ai-copilot-history", label: "Histórico das análises", description: "Consulte análises anteriores da IA.", icon: "history" },
    ],
  },
  {
    id: "pesquisa",
    label: "Pesquisa e precedentes",
    tools: [
      { path: "/dashboard/jurisprudence", label: "Pesquisar jurisprudência", description: "Busque decisões e fundamentos por tema.", icon: "search" },
      { path: "/dashboard/precedents", label: "Precedentes", description: "Temas, repetitivos, IRDR e repercussão geral.", icon: "gavel" },
      { path: "/dashboard/precedent-intelligence", label: "Precedent Intelligence", description: "Aderência, distinguishing e impacto dos precedentes nos seus casos.", icon: "scale" },
      { path: "/dashboard/jurisprudence-library", label: "Jurisprudência Salva", description: "Guarde teses, decisões e fundamentos.", icon: "archive" },
    ],
  },
  {
    id: "estrategia",
    label: "Estratégia avançada",
    tools: [
      { path: "/dashboard/litigation-strategy", label: "Strategy Engine", description: "Deal Breaker, Victory Plan e tática.", icon: "target" },
      { path: "/dashboard/judge-simulator", label: "Simular juiz", description: "Treine argumentos e pressão de audiência sem promessa de resultado.", icon: "gavel" },
      { path: "/dashboard/judge-history", label: "Simulações salvas", description: "Revise sessões anteriores do simulador.", icon: "history" },
      { path: "/dashboard/red-team-simulator", label: "Red Team ao vivo", description: "Debata com a parte contrária simulada.", icon: "shield" },
      { path: "/dashboard/red-team", label: "Red Team da tese", description: "Encontre fragilidades na sua tese ou petição.", icon: "shield" },
      { path: "/dashboard/chief-legal-officer", label: "Chief Legal Officer", description: "Visão executiva para decisões complexas.", icon: "brain" },
      { path: "/dashboard/legal-intelligence-engine", label: "Legal Intelligence", description: "Inteligência jurídica e padrões.", icon: "brain" },
      { path: "/dashboard/legal-intelligence-history", label: "Relatórios de Legal Intelligence", description: "Consulte relatórios gerados anteriormente.", icon: "history" },
      { path: "/dashboard/war-room", label: "War Room", description: "Cenários, riscos e plano de ataque.", icon: "shield" },
      { path: "/dashboard/partner-council", label: "Partner Council", description: "Simule uma reunião de sócios.", icon: "brain" },
      { path: "/dashboard/opponent-database", label: "Banco de Oponentes", description: "Mapeie adversários e padrões.", icon: "shield" },
      { path: "/dashboard/tribunal-heatmap", label: "Mapa dos Tribunais", description: "Tendências e comportamento decisório.", icon: "database" },
      { path: "/dashboard/enterprise-command-center", label: "Command Center", description: "Painel executivo avançado.", icon: "brain" },
      { path: "/dashboard/one-click-actions", label: "Ações rápidas", description: "Atalhos para tarefas frequentes.", icon: "wand" },
    ],
  },
] as const

export const ALL_TOOLS: readonly Tool[] = TOOL_GROUPS.flatMap((group) => group.tools)
