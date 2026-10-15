# NexJud Enterprise — matriz de homologação técnica (PR #61)

Este documento é um registro de evidências **do ambiente descartável**, não uma autorização de implantação. Nada descrito aqui deve ser executado no Supabase de produção sem revisão de migração, backup/rollback e aprovação explícita.

## Verificado / automatizado

| Escopo | Arquivos / validações |
| --- | --- |
| Catálogo legado | Consulta **somente leitura** ao NexJud em 15/10/2026 confirmou `legal_cases(id uuid PK, user_id uuid NOT NULL, title text NOT NULL, process_number text, metadata jsonb)`; políticas pessoais de acesso permanecem habilitadas |
| Fixture local | `F34` reproduz os nomes, tipos e defaults do catálogo legado, sem importar dados de clientes |
| Nova tabela de vínculos | `F46` exige as colunas legadas esperadas e RLS prévio, cria apenas `enterprise_case_links`, com FK de mesmo tenant, exclusão em cascata do caso e **zero permissões de cliente** |
| Segurança da estrutura | `F47` comprova RLS deny-by-default, sem policies, sem GRANT de cliente, relações e unicidade |
| Importação atômica | `F36` (substituição de `F29` somente no CI) vincula cada lote ao `legal_cases` do usuário iniciador. `F37` testa revogação, papéis, isolamento e rollback |
| HTTP/JWT | `F41`–`F44` exercitam PostgREST/PG real de CI, Deno e GoTrue local com usuários fictícios, inclusive replay, conflito e revogação |
| Web/PWA | Importação CSV e lista de casos do próprio usuário; CI de domínio, build Web |
| Native | Expo TypeScript e produção JS via Metro Android/iOS; APK preview exige projeto de staging e tem IDs de instalação próprios |

## Ordem estritamente de staging (ainda não aplicada remotamente)

1. Provisionar **Supabase de homologação separado**. Verificar que nenhum projeto de produção está associado ao CLI/EAS. Usar contas e processos fictícios.
2. Revisar o esquema real e criar migração própria baseada em `F7`, políticas de leitura de organização `F14`, autorização `F20`, gateway `F32`, vínculo `F46` e RPC `F36`, nessa dependência lógica. Os scripts não formam uma migração única pronta para produção; `F34` e `F15` são exclusivamente fixtures e **não podem** ser aplicados a banco real.
3. Validar permissões em `authenticated`, `anon`, `service_role`, `enterprise_internal` e contratos HTTP/RPC no staging. Conferir capacidade de restauração e rollback antes de promover.
4. Implantar a Edge Function somente em staging, com allowlist de origens, rate limits e audit logs revisados, validar frontend Web, PWA e Expo contra **o mesmo staging**.
5. Criar APK preview e distribuição interna iOS, instalar fisicamente e testar cadastro, login/logout, importação, replay, troca de organização, exclusão de caso e perda/revogação de permissões.
6. Após homologação, revisar migrações de produção, backups, monitoramento, versions/build numbers, assinaturas e aprovação explícita. Não fazer merge, deploy ou publicar lojas nesta fase.

## Lacunas e limites

- O CI usa PostgreSQL descartável e GoTrue local. **Não comprova deploy nem migração em Supabase hospedado.**
- O compartilhamento dos casos com toda a equipe **não existe**: os casos recém-importados só são visíveis ao seu `user_id` devido à RLS legada.
- A função e as migrações Enterprise **não foram aplicadas no Supabase atual**.
- Não há novo APK/AAB/IPA assinado nem validação em dispositivo físico confirmada.
- Não remover, substituir ou relaxar políticas de `legal_cases` para viabilizar o fluxo Enterprise.
