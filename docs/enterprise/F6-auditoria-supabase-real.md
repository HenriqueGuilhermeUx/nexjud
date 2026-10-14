# F6 — Auditoria do Supabase real da NexJud (14/10/2026)

Projeto confirmado: `zoruralbsxrbsaicihzu` (organização SmartBot Staff). Inspeção **somente leitura**; nenhuma migração aplicada.

## Inventário confirmado

- `public.legal_cases`: PK `id uuid`, `user_id uuid not null` referenciando `auth.users(id)`, `process_number text`, `metadata jsonb`; 2 registros.
- `public.cnj_processes`: PK `id uuid`, `user_id uuid nullable`, `case_id uuid nullable`, `process_number text not null`; 1 registro.
- `public.knowledge_documents`: `user_id uuid not null`, `case_id uuid` FK para `legal_cases` com ON DELETE SET NULL; 3 registros.
- `public.legal_case_dossiers`: `user_id uuid not null`, `case_id uuid` FK para `legal_cases` com ON DELETE CASCADE; UNIQUE(user_id,case_id).
- `public.profiles`: `id uuid` FK para `auth.users`, sem `organization_id`.
- RLS habilitado nas 44 tabelas públicas listadas; políticas existentes dos casos e documentos restringem por `auth.uid() = user_id`. Isso protege propriedade individual, **não equivale a autorização multi-tenant**.

## Plano incremental proposto — NÃO APLICADO

1. Criar tabelas novas `enterprise_organizations`, `enterprise_memberships`, `enterprise_import_batches`, `enterprise_import_items`, `enterprise_import_audit`, com PKs UUID, FKs, índices, constraints de unicidade (organization_id,idempotency_key), RLS habilitado e políticas de acesso explícitas.
2. Preferir inicialmente tabelas Enterprise separadas e sem acesso direto ao navegador para operações de importação. Validar sessão no servidor; autorização e inserção em **uma transação**, com verificação de associação e função do usuário no banco (não confiar em claims fornecidas pelo cliente).
3. Não alterar `legal_cases.user_id` ou políticas existentes na primeira migração. Criar vínculo explícito `enterprise_case_links` (organization_id,case_id), com checagem de titularidade e regras de compartilhamento antes de permitir leitura por outros membros. Evitar expor casos por mera associação declarada.
4. Garantir replay idempotente por chave única e fingerprint calculado no servidor; conflito quando a mesma chave vier com conteúdo diferente. Persistir recibo e auditoria na mesma transação.
5. Criar testes de RLS usando usuários de duas organizações e usuário individual; confirmar que nenhuma organização acessa dados da outra, inclusive por FK, views, RPCs e Storage.
6. Aplicar em ambiente de homologação após backup e aprovação do plano, executar advisors, só então considerar produção.

## Pendências

- Definir fluxo de criação/convite/remoção de membros e papéis, inclusive separação entre criador, owner e administrador.
- Decidir se casos Enterprise serão registros de `legal_cases` ou armazenamento isolado, após inspeção das chamadas reais do frontend.
- Verificar a existência de backup e ambiente de homologação antes de aplicar DDL.
- Validar configuração da Data API e privilégios `GRANT`, além das políticas RLS.

## Avisos preexistentes do Security Advisor

- `public.touch_strategic_memory_updated_at`: search_path mutável.
- Extensão `vector` em `public`.
- Leaked Password Protection desabilitada.

Nenhum aviso foi alterado nesta auditoria.
