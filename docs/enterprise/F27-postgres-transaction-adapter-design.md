# F27 — Adaptador PostgreSQL para importações (proposta)

**Estado:** especificação de integração, não conectada à API nem ao Supabase de produção.

## Mapeamento de contratos

`createTransactionalImportPersistence(database)` usa uma transação real, criada no servidor, com três métodos:
1. `assertCanImport(org, actor)`: verificar a identidade JWT validada, vínculo ativo e papel owner/admin/legal **na mesma transação**. Não aceitar `actor` fornecido pelo corpo da requisição.
2. `reserveOrFind(org, key, fingerprint)`: usar a restrição UNIQUE `(organization_id, idempotency_key)`, com lock/serialização adequada para concorrência. A consulta por lote existente deve sempre filtrar a organização.
3. `persist(input)`: gravar batch, itens, recibo e evento de auditoria antes do COMMIT. Uma falha em qualquer etapa deve resultar em ROLLBACK.

## Problemas que impedem a ligação direta

- A proposta F7 possui `enterprise_import_items` como itens de importação, **não** cria/atualiza processos em `legal_cases`. Definir e revisar o mapeamento sem alterar o schema legado implicitamente.
- O recibo do domínio contém `organizationId`, `idempotencyKey`, `itemCount`, `actorId` e `plannedAt`. A coluna `receipt jsonb` deve preservar esse formato.
- `enterprise_import_audit.action` admite `import_created`, `import_replayed`, `import_conflict`; o evento de domínio `enterprise.case_import.planned` **não** pode ser inserido diretamente nessa coluna.
- `cnj_digits` exige exatamente 20 dígitos; validar antes da transação e revalidar por CHECK.
- A operação de `reserveOrFind` não deve retornar `reserved` se a reserva não estiver protegida por lock ou índice único na transação.
- Um erro `unique_violation` não pode ser convertido automaticamente em conflito: buscar o fingerprint existente, comparar e recuperar o recibo somente após serialização segura.
- Os testes de concorrência F25 provam a unicidade do banco, mas **não** provam a semântica completa de replay da aplicação.
- `service_role` ou credenciais de conexão nunca devem ser incluídos no frontend; a identidade deve ser revalidada no backend.
- Não implementar `SECURITY DEFINER` de escrita sem revisão de `search_path`, privilégios de EXECUTE, RLS e escalonamento de privilégios.

## Gate de implementação
- Selecionar driver PostgreSQL e integração com o backend existente da NexJud, sem introduzir um segundo pool desnecessário.
- Testes reais em PostgreSQL 17 com duas conexões, conflito, replay, revogação e rollback.
- Revisão de privilégios e isolamento multi-tenant.
- CI verde e aprovação explícita antes de qualquer migração ou deploy de produção.

A PR #61 permanece draft e isolada.
