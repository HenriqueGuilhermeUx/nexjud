# NexJud — barreiras de segurança de builds (PR #61)

Este incremento protege o **desenvolvimento Enterprise** contra geração acidental de artefatos com a identidade de produção. Os workflows permanecem disponíveis, mas seus *jobs* de produção são bloqueados antes de executar etapas com segredos de assinatura ou EAS.

| Workflow manual | Branch de trabalho | Condição para artefato de produção |
| --- | --- | --- |
| `eas-build-companion.yml` | preview permitido na feature | production: **main + confirm_production=true** |
| `nexjud-mobile-local-apk-aab.yml` | bloqueado | somente **main** (usa assinatura Play) |
| `store-builds.yml` | bloqueado | **main + confirm_production=true**; envio iOS exige também `submit_ios=true` |
| `nexjud-ios-api-sign.yml` | bloqueado | somente **main** (gera identidade Apple e envia TestFlight) |

O bloqueio ocorre no **job if** do GitHub Actions, antes de checkout, chaves ou geração de artefatos. Testes em `src/enterprise/nativeReleaseWorkflowGuards.test.ts` detectam remoção involuntária destas regras. As regras não realizam merge, publicação, submissão ou release por conta própria. Essas ações dependem de homologação e autorização humana.

Os perfis EAS `preview` continuam exigindo Supabase de homologação separado e bundle IDs `.preview`. Sem um destino real e revisado de staging, o EAS deverá falhar de maneira segura. A produção permanece inalterada porque esta PR ainda é draft.

## Pendências efetivas

1. Provisionar um Supabase para homologação do NexJud, independente da produção e de outros projetos, após confirmação de custos.
2. Revisar migrações staging F7/F14/F20/F32/F36/F46/F47, Auth, RLS e acessos a processos.
3. Construir APK/IPA de teste, testar em dispositivos e conferir logs; não declarar AAB assinado nem aprovação das lojas por CI de JavaScript.
4. Só após validação integral e aprovação explícita propor merge e publicação.
