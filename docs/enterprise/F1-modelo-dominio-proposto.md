# NexJud Enterprise — contrato inicial de domínio (proposta)

Status: desenho técnico, NÃO aplicado ao banco. Revisar contra migrações existentes antes de gerar SQL.

## Entidades previstas
- organizations: id, legal_name, status, created_at.
- organization_members: organization_id, user_id, role (owner/admin/legal/reviewer/reader), created_at.
- enterprise_cases: id, organization_id, cnj_number, tribunal, subject, status, risk_level, assigned_user_id, created_at, updated_at. Unique(organization_id, cnj_number).
- case_tasks: id, organization_id, case_id, kind, status, due_at, assigned_user_id, completed_at.
- case_evidence: id, organization_id, case_id, storage_path, sha256, source_type, source_reference, collected_at, uploaded_by, review_status.
- case_reviews: id, organization_id, case_id, review_type, reviewer_id, decision, justification, created_at.
- case_events: id, organization_id, case_id, actor_id, event_type, payload_redacted, created_at.
- enterprise_import_jobs: id, organization_id, source, idempotency_key, status, counters, error_summary, created_at.

## Invariantes de segurança
- RLS obrigatório em todas as tabelas por associação autenticada à organização; papéis restritos para escrita e aprovação.
- Organization_id imutável por usuário comum; validado no banco, não somente na UI.
- Evidências privadas em storage com políticas por organização e controle de acesso por caso.
- Eventos append-only; sem armazenar segredo, token ou documento completo em payload de auditoria.
- Operações externas com idempotência, retry controlado e rate limiting.
- Usuários de organizações distintas não podem inferir existência de casos de outra organização.
- Acesso administrativo elevado somente por serviço autorizado com auditoria.

## Testes obrigatórios antes de aplicar
1. Usuário A não lê/escreve dados de B.
2. Usuário sem vínculo não lista organizações ou documentos.
3. Leitor não aprova nem altera tarefas.
4. Reimportação do mesmo CNJ não duplica caso.
5. Upload de evidência sem autorização é negado.
6. Alteração indevida de organization_id é negada.
7. Falha de integração não altera estado para concluído.
8. Exclusão/retificação preserva requisitos legais de retenção e auditoria.

## Próximos passos
Conferir schema real Supabase e migrações, decidir compatibilidade com tabelas atuais, produzir migração aditiva, testes de RLS e UI de homologação. Não implantar em produção antes de validação.
