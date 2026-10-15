# NexJud — estratégia de plataforma universal + Enterprise API

Decisão de produto confirmada em 2026-10-14.

## Objetivo
Incorporar capacidades inspiradas na Enter ao produto NexJud existente, sem retirar funcionalidades, disponibilizando o núcleo de inteligência e operação jurídica a clientes individuais e escritórios, e oferecendo integração corporativa para grandes organizações.

## Uma plataforma, dois modos de consumo
1. **NexJud App:** experiência completa na interface existente, com acesso às novas capacidades mediante controles de segurança, limites de consumo e permissões. Nenhuma capacidade fundamental será artificialmente exclusiva do segmento Enterprise.
2. **NexJud Enterprise/API:** o mesmo núcleo de domínio, acessível por portal corporativo, API autenticada, webhooks, importação em lote, conectores e automações auditáveis.

## Capacidades transversais
- Ingestão de processos, deduplicação e sincronização de andamento.
- Triagem, tarefas, prazos, responsáveis e revisão humana.
- Evidências documentais com proveniência, integridade e controle de acesso.
- Pesquisa jurídica e geração assistida com citações rastreáveis.
- Jurimetria explicável e relatórios; não exibir previsão estatística sem validação.
- Sinais de inconsistência/antifraude para revisão, nunca imputação automática.
- Operação financeira: provisões, acordos e cenários com metodologia documentada.
- APIs e webhooks versionados com autenticação, quotas, idempotência, observabilidade e trilha de auditoria.

## Modelo de acesso
- Usuário individual: escopo pessoal ou de escritório já autorizado.
- Organização Enterprise: tenant, membros, papéis e políticas de acesso verificadas no servidor e no banco.
- Serviços compartilhados de domínio, com adapters de interface e API.
- Limites de volume, SLA e integrações podem variar por plano; regras de segurança não variam.

## Compatibilidade e segurança
- Não substituir módulos atuais sem auditoria e testes de regressão.
- Preservar dados, contratos de API, login, assinaturas e fluxos existentes.
- Nenhum cliente pode consultar recursos de outro tenant.
- Atos processuais, acordos e decisões relevantes requerem autorização humana.
- Dados pessoais sujeitos a finalidade, retenção e controles LGPD.
- Sem alterações diretas de produção antes de testes e validação.

## Sequência de execução
1. Mapear serviços existentes e pontos de extensão do aplicativo.
2. Implementar serviços de domínio compartilhados com testes.
3. Validar o projeto Supabase correto, criar RLS e modelos aditivos.
4. Integrar UI do usuário individual e do escritório.
5. Expor APIs Enterprise e webhooks com testes de autorização e carga.
6. Piloto, monitoramento e liberação progressiva.

Referências de acompanhamento: issues #54–#60.
