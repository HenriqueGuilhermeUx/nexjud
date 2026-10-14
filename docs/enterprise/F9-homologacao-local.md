# NexJud Enterprise — homologação sem Supabase pago

Esta trilha roda em **PostgreSQL 17 descartável**, sem dados reais e sem acessar produção. Requer Docker e psql locais.

## Executar

Na raiz do repositório:

```bash
docker run --rm -d --name nexjud-enterprise-pg -e POSTGRES_PASSWORD=local-only -p 127.0.0.1:55432:5432 postgres:17
export PGPASSWORD=local-only
until psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; do sleep 1; done
psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55432 -U postgres -d postgres -f docs/enterprise/F9-local-auth-fixture.sql
psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55432 -U postgres -d postgres -f docs/enterprise/F7-migracao-sql-proposta.sql
psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55432 -U postgres -d postgres -f docs/enterprise/F8-staging-catalog-assertions.sql
docker stop nexjud-enterprise-pg
```

## Limites da validação

- A fixture `auth.users` é **simulada** e não substitui Supabase Auth real.
- A proposta F7 é deny-by-default; ainda **não há políticas de acesso organizacional** nem endpoint de importação transacional. Não declarar multi-tenant validado só porque F8 passou.
- Para validar isolamento de dados, executar testes com duas organizações, duas identidades e papéis distintos depois de implementar o fluxo autenticado.
- Não usar dados de clientes nem chaves de produção.
- Evitar executar a migração diretamente no projeto Supabase principal.
- Esta trilha é uma homologação de esquema PostgreSQL, não uma homologação completa do produto.
