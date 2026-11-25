# Schema do Supabase — estado de produção

`production_snapshot_2026-11-25.sql` é o schema `public` do projeto de produção
(`zoruralbsxrbsaicihzu`), extraído do catálogo do Postgres em 2026-11-25.
Ele substitui `supabase/schema.sql`, que ficou muito desatualizado (cobria 4 tabelas).

Não é uma migration. Fica fora de `supabase/migrations/` de propósito, para a CLI
nunca tentar aplicá-lo no banco de produção.

## Resumo

| Item | Produção |
|---|---|
| Tabelas em `public` | 45, todas com RLS ligado |
| Policies | 86 |
| Views | 1 (`legal_case_outcome_metrics`) |
| Funções SQL próprias | 8 |
| Triggers | 4 (1 em `auth.users`) |
| Bucket de storage | `knowledge-files` (**público**) |
| Migrations registradas no banco | 10, todas de 12 a 16/10/2026 |

## Divergências encontradas entre repo e produção

1. **Tabela `automation_notifications` não existe em produção.** A migration
   `supabase/migrations/20260717_create_automation_notifications.sql` está no repo
   mas nunca foi aplicada. Quem usa: Central de notificações (`Dashboard.tsx`,
   `notificationService.ts`), `process-movement-impact` e `morning-brief-cron`.
   Hoje essas inserções falham.
2. **Tabela `process_intelligence` não existe** e é lida por
   `src/services/tribunalDnaService.ts`.
3. **Histórico de migrations não bate.** Os 13 arquivos de `supabase/migrations/`
   (nomes `2026MMDD_*.sql`) não aparecem em `supabase_migrations.schema_migrations`.
   As 10 migrations registradas no banco foram aplicadas direto no painel/MCP e
   não têm arquivo no repo. Por isso `supabase db push` não é seguro hoje.
4. **Bucket `knowledge-files` é público.** Documentos enviados à base de
   conhecimento abrem por URL sem login.
5. **`woovi_webhooks_raw` aceita INSERT anônimo** (policy `with check (true)`), e a
   função `handle_woovi_webhook` grava numa coluna `payload` que não existe.
   O webhook atual (`woovi-webhook`) não usa nenhum dos dois.
6. **`subscriptions` tem 4 índices em `user_id`**, dois deles duplicados.

Atualização 2026-11-25 (autorizado): itens 1, 4 e 5 corrigidos em produção;
`automation_notifications` criada e índice único em
`legal_strategic_memories(source_outcome_id)`; as 4 funções não publicadas foram
publicadas. O item 2 era código morto (removido). Os itens 3 e 6 continuam abertos.

## Edge Functions: repo × produção (2026-11-25)

- Publicadas e sem código no repo até agora: `process-check`, `red-team`,
  `super-responder`, `rapid-api`, `generate-embedding`, `strategic-report`
  (trazidas no PR de segurança), `judge-simulator`, `draft-generator`,
  `red-team-simulator` (trazidas neste PR).
- No repo e **não publicadas**: `analyze-case`, `live-dossier-ai`,
  `outcome-learning-ai`, `precedent-impact-scanner`, `precedent-intelligence-ai`,
  `woovi-subscription`. As telas que chamam `live-dossier-ai`,
  `outcome-learning-ai`, `precedent-intelligence-ai` e `precedent-impact-scanner`
  quebram em produção.
- `setup-oab`: o arquivo do repo era uma versão antiga; o PR de segurança
  substitui pela publicada.

## Como regenerar o snapshot

Com acesso de leitura ao banco (SQL Editor ou `psql`), o jeito mais simples é:

```bash
supabase db dump --project-ref zoruralbsxrbsaicihzu --schema public > supabase/schema/production_snapshot_$(date +%F).sql
```

Este snapshot foi montado com consultas ao catálogo (`pg_attribute`,
`pg_constraint`, `pg_indexes`, `pg_policies`, `pg_get_functiondef`,
`pg_get_triggerdef`, `pg_views`) porque a CLI não estava disponível.
