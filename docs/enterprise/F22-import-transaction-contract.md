# F22 — Contrato de persistência de importação Enterprise

**Estado:** desenho para homologação, não é endpoint ativo e não foi aplicado ao Supabase.

## Pré-condições obrigatórias
- Identidade extraída de JWT validado no servidor; nunca aceitar `actor_id` do payload.
- `organization_id` pertence a uma organização da qual `auth.uid()` é membro com papel `owner`, `admin` ou `legal`, verificado **dentro da transação**.
- `service_role` nunca é exposta ao cliente. As tabelas de importação continuam sem grants diretos para `authenticated` e `anon`.
- O servidor valida limites de lote, identificadores, CNJ, campos obrigatórios e fingerprint canônico antes da escrita.
- Não aceitar `receipt` fornecido pelo cliente como evidência de persistência.

## Semântica de uma transação
1. Autenticar usuário e verificar autorização por organização.
2. Reservar a chave `(organization_id, idempotency_key)` com restrição UNIQUE e tratamento seguro de concorrência.
3. Se a chave já existe, comparar fingerprint persistido com fingerprint canônico: igual retorna recibo persistido sem nova escrita; diferente retorna conflito 409 sem criar itens.
4. Se nova, inserir batch, itens e evento `import_created` na mesma transação.
5. O recibo deve refletir somente os itens realmente persistidos, com identificadores estáveis.
6. Qualquer falha de validação, FK, inserção ou auditoria desfaz **toda** a transação.

## Concorrência e auditoria
- A restrição UNIQUE por organização é a autoridade final contra duplicação, não um SELECT anterior à escrita.
- Replays podem registrar `import_replayed` apenas se isso for explicitamente projetado como uma nova transação auditável, sem alterar os itens originais.
- Eventos de conflito não podem comprometer a atomicidade da importação; política de auditoria de rejeições deve ser definida separadamente.
- Auditoria deve incluir organização, ator autenticado, batch, ação e horário. Nunca armazenar credenciais ou conteúdo sensível desnecessário.

## Critérios de aceite antes de produção
- Mesma chave + mesmo fingerprint = mesmo recibo, zero itens adicionais.
- Mesma chave + fingerprint diferente = conflito, zero itens adicionais.
- Mesma chave em organizações diferentes = independência.
- Duas requisições concorrentes = exatamente um lote criado.
- Falha ao inserir item ou auditoria = zero alterações permanentes.
- Papel reader/reviewer, usuário sem vínculo, usuário revogado e acesso anônimo = nenhuma escrita.
- Usuário da organização A não pode ler, gravar ou inferir dados da B.
- Revisão de `SECURITY DEFINER`, `search_path`, EXECUTE e RLS antes de qualquer migração.
- Integração real com API, autenticação e logs ainda deve ser implementada e validada em staging.

**Bloqueio de publicação:** esta especificação não autoriza migração de produção nem merge da PR #61.
