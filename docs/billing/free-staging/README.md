# NexJud - testes de cobranca em PostgreSQL descartavel

Usa PostgreSQL 17 temporario do GitHub Actions, com IDs e dados inventados. Nao cria projeto ou branch Supabase e nao executa migracao na producao.

01-fixture.sql: estrutura minima compativel, roles e RLS. 02-atomic-entitlement-proposal.sql: campo de vencimento e funcao transacional privada, executavel apenas pelo service_role de teste depois de validação criptografica confiavel da Woovi. 03-tests.sql: nao acesso cruzado, proibicao de escrita, pendente sem acesso, confirmacao concede um mes, webhook repetido nao aumenta vencimento, renovacao distinta, preservacao de plano superior e rollback.

Este experimento NAO integra automaticamente a Woovi, NAO produz Pix Automatico, NAO testa Auth/Edge hospedados e NAO autoriza deploy do SQL em producao. Proxima etapa: testar o stack Supabase local completo com Docker e dados inventados, depois homologar sandbox Woovi com webhook assinado, e planejar migracao reversivel para clientes legados sem retirar acesso existente.
