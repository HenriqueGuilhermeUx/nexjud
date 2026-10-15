# NexJud Enterprise — Inventário técnico F0

Data: 2026-10-14. Escopo: análise estática inicial; não equivale a homologação.

## Base identificada
- Frontend React 18, TypeScript, Vite, React Router e Supabase JS.
- Rotas existentes: EnterpriseCommandCenter, DecisionIntelligence, ProcessPortfolio, DraftGenerator, TribunalHeatmapCenter, OpponentDatabaseCenter, LegalIntelligenceEngine.
- EnterpriseCommandCenter utiliza enterpriseIntelligenceService para processos, Tribunal DNA, inteligência de adversário, risco de cliente e board reports; usa também geração de PDF e IA para relatórios.
- DecisionIntelligence consulta DataJud, busca casos similares e cria evidências normalizadas; comunica expressamente que registros não equivalem a previsão de êxito.
- ProcessPortfolio lista processos do usuário, tribunais, classes e consultas recentes.
- Supabase config declara Edge Functions e configuração de autenticação; regras de RLS ainda precisam ser verificadas nas migrações.

## Não assumir como concluído
- Ingestão em lote com idempotência e recuperação de falhas.
- Isolamento de organizações com RLS testado e RBAC corporativo.
- Esteira de prazos, responsáveis, SLAs e aprovação humana.
- Conectores ERP, subsídios internos, cadeia de custódia e antifraude.
- Provisões e modelos financeiros validados.
- CI, testes E2E, carga, conformidade LGPD e piloto real.

## Critérios de arquitetura
1. Reutilizar serviços existentes; evitar duplicação de consultas DataJud.
2. Toda leitura/escrita Enterprise deve ser delimitada por organização e autorização server-side; nunca confiar somente em filtros do frontend.
3. Evidências: fonte, data, hash, vínculo processual, versão e trilha de auditoria.
4. Sinais antifraude são alertas revisáveis, não imputações automáticas.
5. IA não pode executar acordos, petições ou atos processuais sem autorização e revisão humana.
6. Novas migrações aditivas, reversíveis e testadas; nenhuma publicação automática em produção.

## Próxima entrega
Inspecionar migrations/policies, enterpriseIntelligenceService, autenticação e CI. Produzir desenho de tabelas e APIs e testes de isolamento antes de implementar telas Enterprise.

Acompanhamento: #54 e #55–#60.
