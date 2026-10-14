# F38 — Verificação integrada Enterprise (staging, 14/10/2026)

## Estado verificável
- `F34` é **fixture local**: replica somente os campos necessários de `legal_cases` (id, user_id, title, process_number e metadata), identificados no catálogo real, **sem dados de clientes**.
- `F36` substitui a RPC privada F29 apenas **no PostgreSQL descartável**: grava lote, itens, casos pertencentes ao ator e links `enterprise_case_links` na mesma transação. Replays devolvem recibo sem criar novos casos; erro reverte tudo.
- `F37` verifica dois tenants, usuários distintos, ausência de leitura cruzada, recusa de papel reader, replay, restrição de identificador externo e integridade de lote/auditoria.
- `handler.test.ts` executa requisições HTTP reais contra a função pura, com dependências de Auth/RPC simuladas; não demonstra conectividade real Edge Function ↔ PostgREST ↔ PostgreSQL.

## Restrições de publicação
- O `legal_cases` real possui RLS por `user_id`. Os casos importados inicialmente **são visíveis apenas ao ator proprietário**; não ampliar RLS a membros de organização sem autorização explícita por caso.
- O schema `enterprise_case_links` necessita migração específica revisada, não usar fixture `F34` em banco real. Não aplicar `F36` antes de revisar permissões e compatibilidade do schema.
- API SQL pública restrita a `authenticated`, e autorização decisiva na RPC privada. Verificar PostgREST, assinatura JWT, CORS, limites, rate limiting e auditoria com teste real em staging antes de liberar.
- A interface Web/PWA mostra o comando de importação, mas ainda não prova app Android/iOS nativo. Não publicar builds de lojas ou produção.
- Fazer backup, revisão de RLS, rollout controlado e plano de rollback após validação e aprovação explícita.
