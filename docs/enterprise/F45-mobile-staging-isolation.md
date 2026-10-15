# NexJud Enterprise — isolamento de ambientes no aplicativo nativo

**Estado:** a PR #61 preserva o backend do app de produção; a homologação Enterprise segue em banco descartável no CI. O projeto Supabase de homologação ainda não foi configurado.

## Backend por perfil EAS

| Perfil EAS | Backend | Proteção |
|---|---|---|
| production | NexJud existente | Mantém a URL/chave pública atuais; nenhum deploy foi feito |
| preview | Supabase de teste separado | Sem URL e chave pública de homologação, o build EAS é bloqueado |
| development | Supabase de teste ou local | HTTP somente em localhost/127.0.0.1/10.0.2.2 |

A configuração dinâmica em `mobile/app.config.js` conserva os identificadores originais na produção e usa `com.nexjud.companion.preview` em Android/iOS para builds de homologação (e `.dev` para desenvolvimento), com nome e deep link separados. Dessa forma os aplicativos não se substituem ao instalar a versão de teste. Para assinar um IPA de homologação iOS será necessário configurar o provisionamento do bundle ID `.preview`.

O campo `EXPO_PUBLIC_NEXJUD_ENV` é fixado por perfil em `mobile/eas.json`. A implementação está em `mobile/src/lib/backendConfig.ts`, com teste automatizado em `src/enterprise/mobileBackendConfig.test.ts`.

O hook EAS `eas-build-pre-install` invoca `mobile/scripts/assert-backend-env.mjs` e exige `EAS_BUILD_PROFILE`, inclusive quando `EAS_BUILD` não estiver definido. Ele impede que APKs de teste usem o endereço/chave do projeto de produção, configurações incompletas ou chaves privilegiadas. A validação roda no início do build EAS, enquanto CI usa casos positivos e negativos de execução.

## Preparação do APK preview

1. Criar um **projeto Supabase separado** para homologação. Não criar nem importar contas ou casos de clientes reais.
2. Validar as migrações Enterprise e o fluxo completo de Auth nesse projeto. As fixtures `F34` e `F36` são somente para banco descartável e não devem ser aplicadas diretamente em produção.
3. Configurar, no projeto EAS NexJud / ambiente `preview`, `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` referentes exclusivamente ao banco de teste. São valores **públicos** do cliente; nunca usar `service_role` ou outras credenciais privilegiadas em `EXPO_PUBLIC_`.
4. Reexecutar o CI e construir com o perfil EAS `preview`; conferir visualmente que o app aponta para staging antes de autenticar usuários fictícios.
5. Validar em dispositivo: login, listagem de empresas autorizadas, upload CSV, pré-visualização, idempotência, bloqueio por papel/revogação, abertura e exclusão de caso.
6. Antes de builds de loja, conferir versão de Android/iOS, assinatura, permissão de câmera/arquivos e plano de rollback. Nenhum merge ou publicação de produção nesta PR.

**Critério de aceite:** staging autenticado e isolado + testes em Android/iOS reais + revisão de migrações e permissões + aprovação de publicação.
