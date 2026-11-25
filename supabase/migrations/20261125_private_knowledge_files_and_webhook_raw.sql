-- 1) Documentos da base de conhecimento deixam de abrir por URL pública.
--    As policies de storage (knowledge_files_*_own) já limitam leitura/escrita
--    à pasta do próprio usuário; o site passa a usar links assinados.
update storage.buckets set public = false where id = 'knowledge-files';

-- 2) woovi_webhooks_raw aceitava INSERT de qualquer pessoa com a anon key.
--    O webhook atual (Edge Function woovi-webhook) não usa esta tabela.
drop policy if exists "Permitir inserção pública" on public.woovi_webhooks_raw;
