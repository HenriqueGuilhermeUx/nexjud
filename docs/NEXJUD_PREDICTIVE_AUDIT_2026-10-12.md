# NexJud — auditoria técnica e posicionamento IA preditiva (12/10/2026)

## Escopo e evidência
Auditoria estática da branch main em 12/10/2026. Arquivos revisados: src/App.tsx, src/pages/PredictiveAI.tsx, src/lib/api.ts, src/pages/DecisionIntelligence.tsx, src/intelligence/decisionPattern.ts, src/intelligence/evidenceQuality.ts, src/services/datajudService.ts, src/services/processIntelligenceService.ts, supabase/functions/outcome-learning-ai/index.ts, src/pages/OfficeIntelligence.tsx, src/pages/Landing.tsx, supabase/migrations/20260905_outcome_intelligence.sql, docs/NEXJUD_LAUNCH_AUDIT.md, vite.config.ts e árvore do repositório. Não houve teste E2E com usuário real, banco de produção, Edge Functions implantadas ou Google Play Console.

## Achados P0 — não comercializar como previsão estatística validada
1. src/pages/PredictiveAI.tsx usa getMockData() para gráficos DNA do Juiz, score recursal e alertas. src/lib/api.ts declara esses valores explicitamente estáticos/mock; exibi-los ao lado de um resultado pode confundir dado fictício com evidência.
2. src/lib/api.ts performPredictiveAnalysis chama /functions/v1/super-responder e performJurisprudenceSearch chama /functions/v1/rapid-api; nenhuma dessas funções consta da árvore supabase/functions do repositório. Podem existir remotamente, mas não há evidência versionada de implantação. Além disso, a requisição usa bearer da chave anônima e envia userId informado pelo cliente; autenticação, autorização e contabilização de limites devem ocorrer no servidor com JWT do usuário.
3. src/pages/DecisionIntelligence.tsx tem caminho mais defensável: consulta DataJud, normaliza decisões e filtra padrões com proveniência. Mas presença de código não comprova completude das fontes, qualidade da amostra, precisão nem funcionamento em produção.
4. src/intelligence/decisionPattern.ts calcula frequências observadas, não probabilidades preditivas calibradas. src/intelligence/evidenceQuality.ts exige score >= 50 para padrões, limiar que ainda necessita validação empírica.
5. docs/NEXJUD_LAUNCH_AUDIT.md contém checklist de lançamento inteiramente desmarcado. Não há comprovação E2E dos cenários de autenticação, cobrança, OCR, IA, RLS e trial.

## Mudança de segurança comercial desta PR
Rota /dashboard/predictive passa a redirecionar para /dashboard/decision-intelligence, evitando exposição dos gráficos mock na experiência autenticada. Mantém componente legado intacto para migração controlada. Não altera Supabase, banco, billing, PWA nem Android.

## O que já existe no código (não confundir com homologação)
- Frontend: Dashboard, processos CNJ, casos, dossiê, Knowledge Base, Legal Chat, copiloto, jurisprudência, precedentes, Decision Intelligence, estratégias, minutas, War Room, Office Intelligence, alertas, billing e portal PWA.
- Backend versionado: Edge Functions para busca DataJud, casos similares, estratégia, chat, learning por resultados, monitoramento, cobrança Woovi e outras.
- PWA: manifesto e service worker em vite.config.ts; não há confirmação de publicação nem validação offline.
- Android: workflows de build, sem prova nesta auditoria de AAB publicado/funcional.

## Posicionamento proposto
**NexJud | Inteligência jurídica baseada em evidências.**
Promessa: **Antecipe riscos. Compare padrões decisórios. Decida com fundamento.**
Diferencial: rastreabilidade da decisão pública, comparabilidade de casos, cenários, alertas de mudança de entendimento, memória do escritório e revisão humana. Não afirmar porcentagem de vitória sem modelo validado.

## Motor preditivo confiável — critérios de aceite
1. Dataset com decisão-fonte verificável, tribunal/órgão, data, classe, assunto, tipo de decisão, resultado e contexto; deduplicação e controle de versões.
2. Definição clara do alvo (por exemplo, provimento de recurso por classe e órgão), população elegível, janela temporal, viés de seleção, exclusões e tamanho de amostra.
3. Treino e teste separados por tempo/processo; evitar vazamento entre decisões do mesmo processo.
4. Avaliação: Brier score, log loss, calibração por faixas, erro por tribunal/área, intervalos de incerteza e drift. Comparação com baseline simples.
5. Abstinência quando amostra insuficiente, baixa qualidade, classe não suportada ou drift; nunca inventar precisão.
6. UI mostra: fonte, n, período, filtros, limitações, fatores relevantes e revisão por advogado. Frequência histórica rotulada como frequência, não probabilidade.
7. LGPD, segredo profissional, acesso mínimo, auditoria, retenção e direitos do titular.
8. Monitoramento de dados, alertas e backtesting periódico; aprovação humana para peças, prazos e decisões estratégicas.

## Prioridade de entrega
P0: remover indicadores mock do caminho de produção, autenticar todas as funções e confirmar deploy, RLS, trial, cobrança e testes E2E.
P1: unificar UX Decision Intelligence + dossiê + precedentes + estratégia, medir qualidade das fontes, habilitar observabilidade e relatórios auditáveis.
P2: construir baseline preditivo validado para UMA área/tribunal e lançar piloto controlado com métricas públicas e limites.
P3: ampliar a gestão operacional (clientes, tarefas, prazos, financeiro e portal do cliente) após auditoria funcional de cada fluxo; preservar funcionalidades existentes.

## Estado
**Código auditado parcialmente; execução em produção NÃO validada.** Não marcar módulos como prontos apenas por existir rota/arquivo. iOS fora do escopo por decisão do produto; foco PWA e Google Play.
