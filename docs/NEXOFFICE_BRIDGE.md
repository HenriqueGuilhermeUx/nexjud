# NexJud ↔ NexOffice bridge

O NexOffice entra no NexJud como camada operacional horizontal do escritório. O NexJud continua dono do domínio jurídico (processos, jurisprudência, estratégia, peças e inteligência legal); o NexOffice assume CRM, agenda, tarefas, financeiro, cobrança, documentos operacionais, fiscal e Command Center.

## Estado de rollout

O bridge fica **desligado por padrão**. Não ative o launcher até existir um runtime NexOffice acessível e as variáveis server-side estarem configuradas.

```env
VITE_NEXOFFICE_ENABLED=false
NEXOFFICE_BASE_URL=
NEXOFFICE_INTERNAL_KEY=
```

`NEXOFFICE_INTERNAL_KEY` é segredo server-side. Nunca use prefixo `VITE_`, nunca envie ao browser e nunca persista em tabelas do NexJud.

## Fluxo seguro

1. Usuário autenticado no NexJud clica em **NexOffice**.
2. `POST /api/nexoffice/handoff` valida o access token diretamente no Supabase Auth.
3. A Netlify Function provisiona/recupera o workspace no NexOffice usando o bridge server-to-server.
4. O NexOffice cria um handoff aleatório, single-use, com expiração curta.
5. O browser navega para a URL temporária retornada.
6. O NexOffice consome o código uma única vez e emite a própria sessão.

O access token do Supabase não é repassado ao NexOffice e `NEXOFFICE_INTERNAL_KEY` nunca chega ao cliente.

## Workspace pessoal vs. escritório compartilhado

Por padrão, enquanto o NexJud não tiver um tenant/escritório confiável para aquele usuário, o bridge usa o próprio `user.id` do Supabase como `externalWorkspaceRef`. Isso cria uma experiência pessoal isolada e preserva compatibilidade.

Para várias pessoas entrarem no **mesmo escritório NexOffice**, grave o identificador e a role em **Supabase `app_metadata`**, que é metadata controlada pelo servidor. O bridge aceita os seguintes campos confiáveis:

```json
{
  "nexoffice_workspace_ref": "office_abc123",
  "nexoffice_workspace_name": "Silva & Campos Advogados",
  "nexoffice_role": "member"
}
```

`nexoffice_workspace_ref` é o nome preferido. Para compatibilidade, o bridge também reconhece `organization_id`, `office_id`, `firm_id` e `tenant_id` (incluindo variantes camelCase). Para role, reconhece `nexoffice_role`, `organization_role` e `office_role`.

Roles válidas: `owner`, `admin`, `member`, `viewer`.

### Regra de menor privilégio

- Workspace pessoal, sem tenant confiável: role padrão `owner`.
- Workspace compartilhado com role confiável: usa a role informada.
- Workspace compartilhado sem role ou com role inválida: padrão `member`.
- Campos equivalentes em `user_metadata` **não** controlam tenant nem RBAC e são ignorados para autorização.

Isso impede que um usuário altere metadata de perfil e se promova para outro escritório ou para `owner/admin`.

## Nome do escritório

Quando existe workspace compartilhado, prefira `app_metadata.nexoffice_workspace_name` (ou `organization_name`, `office_name`, `firm_name`). Dados de `user_metadata` podem ser usados apenas como fallback de apresentação; nunca como fonte de autorização.

## Health probe

O endpoint autenticado abaixo permite validar infraestrutura antes de ligar a feature:

```http
GET /api/nexoffice/health
Authorization: Bearer <supabase access token>
```

Ele retorna apenas sinais operacionais seguros:

- `configured`
- `reachable`
- `featureEnabled`
- `service`
- `capabilities`
- `externalEffects`

Ele não provisiona workspace, não cria sessão, não executa cobranças e não retorna secrets.

## Checklist para habilitação

1. NexOffice API + PostgreSQL dedicados disponíveis.
2. `NEXOFFICE_INTERNAL_KEY` forte e idêntica apenas nos dois runtimes server-side.
3. `NEXOFFICE_BASE_URL` apontando para a API correta.
4. `GET /api/nexoffice/health` retornando `configured=true` e `reachable=true` para usuário autenticado.
5. Testar um usuário pessoal e dois membros do mesmo escritório compartilhado.
6. Confirmar que owner/admin/member/viewer chegam ao NexOffice com permissões corretas.
7. Só então mudar `VITE_NEXOFFICE_ENABLED=true` no ambiente escolhido.

Não é necessário ativar efeitos externos do NexOffice para validar SSO, workspace, RBAC, CRM ou Command Center. Pix, mensagens e fiscal permanecem sujeitos às aprovações e gates próprios do NexOffice/NextGen/TaxAgent.