# F31 — Edge Function → RPC privada (contrato e bloqueio de exposição)

Estado: **projeto de integração; não publicado**. A RPC F29 passou no PostgreSQL descartável, mas vive em `enterprise_internal`, um schema propositalmente **não exposto** pelo PostgREST. Uma Edge Function usando `supabase-js.rpc()` com o schema padrão **não consegue chamá-la**. Não resolver expondo `enterprise_internal` na Data API ou concedendo acesso amplo.

## Opção recomendada para a próxima implementação

Criar um gateway `public.enterprise_import_cases` estreito, com assinatura fixa e `SECURITY INVOKER`, que encaminha a chamada à função privada (apenas `authenticated` tem EXECUTE nesta última). O gateway deve ter EXECUTE revogado de PUBLIC/anon e concedido somente a authenticated; ele não pode aceitar actor_id nem aceitar service_role fornecido pelo cliente. O SQL da RPC privada revalida `auth.uid()`, vínculo e papel em cada operação. Verificar que o projeto Supabase expõe o schema public na Data API e que não há FORCE RLS inesperado. Revisar com análise de segurança antes de liberar.

A Edge Function deve validar o bearer token com `auth.getUser(token)`, instanciar o cliente com chave publicável e o **mesmo JWT do usuário**, chamar apenas o gateway e mapear: 201 criado; 200 replay; 409 fingerprint diferente; 400 payload inválido; 401 sessão inválida; 403 sem papel; 503 falha transitória. Não colocar `service_role` no navegador nem confiar em `actorId` enviado pelo cliente.

## Lacunas antes da publicação

- A RPC recebe `p_fingerprint` fornecido pelo chamador: **não prova** que o hash corresponde a `p_items`. Implementar fingerprint canônico computado no servidor, ou comparar com digest calculado na própria RPC, antes de oferecer idempotência pública.
- A F29 grava itens em `enterprise_import_items`, **não** cria/atualiza `legal_cases`. Não anunciar importação de processos como concluída.
- Definir limite de corpo, número de itens, campos, CNJ e `sourceSystem`, resposta de erros sem dados internos, CORS restrito, observabilidade e limites de taxa.
- Testar o gateway sob `anon`, `authenticated`, sem JWT, membro sem papel, membro de outra organização e concorrência.
- Não executar SQL no Supabase de produção, não fazer merge e não publicar Edge Function até aprovação explícita.
