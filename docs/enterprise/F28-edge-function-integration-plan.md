# F28 — Integração da importação Enterprise ao backend existente

**Estado:** plano de implementação, sem endpoint exposto ou deploy.

## Arquitetura encontrada
O repositório NexJud usa React/Vite e `@supabase/supabase-js` no frontend; as operações server-side existentes usam `supabase/functions/*` (Supabase Edge Functions, Deno). Não existe servidor Node/PostgreSQL dedicado configurado no projeto principal.

## Estratégia segura
1. Criar uma **Edge Function** de importação autenticada que valide o token do usuário e o payload, limite tamanho/quantidade, derive `actorId` do JWT e **nunca** confie em papel/organização declarados no corpo.
2. Encapsular a transação no PostgreSQL via uma função SQL/RPC revisada e restrita, pois chamadas separadas do cliente Supabase **não** compartilham transação. A RPC deve revalidar `auth.uid()` e vínculo ativo, usar unicidade `(organization_id,idempotency_key)`, comparar fingerprint, gravar lote/itens/auditoria e devolver o recibo original em replay.
3. A RPC não deve aceitar `actor_id` confiável vindo do cliente, nem permitir gravações diretas nas tabelas. Preferir execução somente por papel de servidor com autorização JWT explícita e verificada, avaliando riscos de `SECURITY DEFINER` e de uso de `service_role`.
4. Não usar `src/enterprise/importTransactionalAdapter.ts` diretamente no bundle React: é um contrato puro de servidor, sem driver real; adaptar a semântica à Edge Function + RPC, com teste de integração em PostgreSQL descartável.
5. Revisar mapeamento dos itens importados com os casos existentes e decidir explicitamente se há criação/atualização em `legal_cases`; nenhuma alteração implícita.
6. Só aplicar migrações após validação de privilégios, RLS, concorrência, rollback, replay, revogação e CI.

## Critérios de aceite
- 401 sem JWT; 403 sem papel ativo; 400 payload inválido; 201 lote criado; 200 replay exato com recibo original; 409 fingerprint diferente; 503 falhas inesperadas.
- Dois requests concorrentes não criam duplicidade nem vazam dados entre organizações.
- Nenhuma credencial de banco, service role ou chave privilegiada no browser.
- Branch/PR de homologação isolada; **não** executar SQL em Supabase produção nem publicar Edge Function sem aprovação.
