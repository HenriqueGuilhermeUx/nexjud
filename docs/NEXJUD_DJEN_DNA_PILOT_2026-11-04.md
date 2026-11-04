# DJEN → DNA do Juiz: plano de ingestão segura (piloto)

Estado: **adaptador de triagem implementado, coleta automática NÃO ativada**.

## Fontes e permissões

- Portal público: https://comunica.pje.jus.br
- Swagger CNJ de homologação: https://hcomunicaapi.cnj.jus.br/swagger/index.html
- Rota pública indicada na documentação: `GET /api/v1/comunicacao`.
- Endpoints autenticados para publicação são **exclusivos dos tribunais**, não confundir com leitura pública.
- Não fixar nomes de paginação sem testar o Swagger, pois exemplos externos divergem (`page/size` vs `pagina/itensPorPagina`). Respeitar os cabeçalhos de limite e não contornar bloqueios.
- CNJ: https://www.cnj.jus.br/programas-e-acoes/processo-judicial-eletronico-pje/comunicacoes-processuais/orientacoes-aos-tribunais/

## Fluxo previsto, desativado

1. **Conector público, apenas GET**: permitir lista explícita de tribunais e dias, limites de páginas, pausas e resposta ao rate limit, cursor por tribunal/dia. Nunca enviar cadastro, publicação ou exclusão.
2. **Raw separado, acesso restrito**: identificação original, origem, data, hash, versão, política de retenção. Confirmar finalidade e base legal LGPD antes de criar Storage/tabelas.
3. **Triagem**: função pura `screenDjenCommunication` bloqueia indícios de sigilo e despachos; sentença/decisão só segue à *revisão humana*, não ao DNA automaticamente. Comunicações não comprovam inteiro teor.
4. **Extração e validação**: tribunal, vara, matéria, tipo, inteiro teor, resultado, nome do magistrado da assinatura *confirmado*, documento originário e URL confiável. Se autoria for incerta, não atribuir ao juiz.
5. **Proteção de dados**: anonimização robusta de partes, endereços, CPFs/CNPJs, nomes e dados sensíveis antes de embeddings; revisão humana; sigilo excluído. A função `redactKnownIdentifiers` é apenas uma prévia de mascaramento, **não** anonimização suficiente.
6. **Índice separado**: somente decisões públicas, documentadas, revisadas, pertinentes à matéria e atribuíveis à unidade/magistrado. Filtrar primeiro por tribunal, vara, magistrado e matéria; depois recuperação semântica.
7. **Resposta do DNA**: recomendação ligada a identificador e trecho citável de cada decisão, distinções fáticas, prova necessária, argumentos contrários e ações de revisão. Sem fontes, abster-se de afirmar padrão individual.

## Piloto para comprovação de qualidade

- Recorte inicial sugerido: um tribunal, uma comarca e matéria com acervo de decisões verificáveis.
- Reunir 20–30 casos cuja decisão já é conhecida; registrar avaliações cegas das estratégias, plausibilidade e correspondência factual.
- Avaliar 100% das citações contra os originais; apontar falhas e lacunas.
- Testar fluxos com 3–5 advogados com documentos autorizados e sem segredo.
- Nunca tratar histórico contribuído por clientes como fonte compartilhada sem consentimento válido e autorização de uso.

## Critérios para ligar a coleta

Verificação real do contrato OpenAPI e autorização de acesso; projeto Supabase NexJud identificado; schema segregado e políticas RLS/retention; revisão jurídica de LGPD/sigilo; prova de coleta mínima e cancelamento com limites; controle operacional para desligar e reprocessar. Nenhum desses gates foi presumido.
