# F13 — Autorização multi-tenant: proposta antes da migração

**Status:** desenho técnico, sem aplicação em Supabase ou produção.

## Estado atual

As cinco tabelas Enterprise são *deny by default*: RLS ativo, nenhuma policy, e privilégios de `anon`/`authenticated` revogados. Esse bloqueio deve continuar até a homologação da autorização positiva.

## Princípios

1. Toda requisição usa a identidade autenticada obtida do token validado pelo servidor/Supabase; nunca confiar em `user_id` fornecido no corpo.
2. `enterprise_memberships` é a única fonte de vínculo e papel. O identificador da organização vindo da URL deve ser verificado contra a identidade antes de qualquer operação.
3. Leitura da organização: somente membro ativo; escrita administrativa: somente `owner`/`admin`. Não implementar cadastro aberto de organizações por uma policy genérica.
4. Importação: `owner`, `admin` e `legal` podem solicitar importações; persistência e auditoria devem ocorrer em uma transação no backend autorizado. Nenhum cliente recebe permissão direta de escrita nos lotes, itens ou auditoria.
5. `anon` não recebe acesso. Operações administrativas e leitura de auditoria devem usar endpoints com autorização explícita, sem expor uma chave `service_role` no navegador.
6. Uma função `SECURITY DEFINER`, se necessária, deve ter `search_path` fixo, argumentos validados, controle de papéis, concessão de `EXECUTE` restrita e testes de abuso.
7. Não usar `auth.uid()` em PostgreSQL local sem fixture de identidade que simule corretamente o JWT; não confundir `SET ROLE authenticated` com usuário autenticado.

## Testes de aceitação antes de habilitar policies

- Usuário da organização A não lê nem altera dados da B, inclusive se adivinhar UUIDs.
- Usuário sem vínculo não vê organizações nem lotes.
- `reader` não importa nem administra membros.
- `legal` pode importar somente para sua organização; `reviewer` não pode importar.
- `owner` e `admin` podem executar somente ações expressamente previstas.
- `anon` é sempre negado; vínculo removido revoga acesso.
- Idempotência é isolada por organização; lote, item e auditoria são gravados atomicamente.
- Falhas de autorização não deixam efeitos parciais; erros não revelam dados de outras organizações.

## Plano seguro

1. Concluir CI dos testes de negação F12.
2. Implementar funções e políticas em uma **nova migração proposta**, não na F7 aprovada.
3. Criar fixtures de identidade e testes positivos/negativos em PostgreSQL 17 descartável.
4. Validar a integração com backend real e revisar manualmente o PR.
5. Só então planejar deploy com aprovação explícita.
