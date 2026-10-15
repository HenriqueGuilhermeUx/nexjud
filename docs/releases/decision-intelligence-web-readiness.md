# Decision Intelligence — release Web/PWA isolado

## Objetivo
Entregar apenas as melhorias de auditoria e exibição de evidências na tela
`/dashboard/decision-intelligence` existente. Não incorpora migrações Enterprise,
novas permissões ou alterações nos serviços de produção.

## Escopo
- Auditoria individual das evidências, deduplicação e requisitos para padrões descritivos.
- Identificação de tribunal/órgão julgador, período e motivos de exclusão de documentos.
- Links de referência com validação de protocolo; autenticidade requer conferência humana.
- Evita resultados de buscas CNJ antigas após mudança do processo, tribunal ou argumentos.
- Testes automatizados de auditoria e de isolamento de consultas assíncronas.

## Fora do escopo
- Migrações Supabase, RLS, Edge Functions, credenciais ou dados de clientes.
- Importação Enterprise, permissões organizacionais e aplicativos nativos.
- Predição de êxito ou inferência de fundamentação a partir do DataJud.
- Novo APK, AAB ou IPA.

## Gates para liberação
1. CI dedicado e Web CI aprovados no mesmo HEAD.
2. Deploy Preview da PR desta release pronto no mesmo SHA.
3. Smoke tests manuais com conta de testes: login, assinatura, /dashboard,
   /dashboard/decision-intelligence, CNJ com resultado e sem resultado,
   fontes e pendências, mudança de processo durante consulta e navegação de retorno.
4. Testar sob JWT real autorizado a disponibilidade e a resposta das funções
   datajud-search e datajud-similar-cases em ambiente seguro. Estarem ativas
   não comprova documentação judicial completa nem uma consulta ponta a ponta.
5. Conferir as variáveis dos Deploy Previews: estes podem apontar para produção
   se o backend não tiver isolamento explícito; não realizar testes com dados reais.
6. Aprovação humana e autorização explícita antes de merge/publicação na main.

## Reversão
Restaurar o deploy estável anterior na Netlify sem qualquer SQL ou exclusão de dados.
O commit de produção conhecido antes desta release é
`ab67384a77ba718eee973b7e36a049b832635644`.
