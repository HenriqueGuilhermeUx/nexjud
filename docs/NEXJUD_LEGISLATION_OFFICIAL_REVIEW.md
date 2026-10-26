# NexJud — pacote de conferência contra publicação oficial (piloto)

Módulo: `src/enterprise/legislationOfficialReviewPacket.ts`.

## O que o módulo faz

- Confere novamente o SHA-256 do arquivo Markdown originalmente recebido do acervo secundário `ctresb/leis`, antes de preparar a comparação.
- Exige que o trecho selecionado pertença integralmente ao documento que foi armazenado em staging.
- Recebe uma **evidência candidata independente**: URL, instante UTC da coleta, identificador de quem coletou e trecho copiado da fonte.
- Para o piloto federal, aceita apenas URLs HTTPS nos hosts explicitamente listados no código. Essa lista **não** afirma que qualquer URL seja suficiente para comprovar a publicação oficial.
- Calcula um hash SHA-256 do trecho candidato e mostra uma comparação *somente de espaços em branco*, conservando as duas versões na saída.
- Retorna sempre `reviewStatus: PENDING_INDEPENDENT_OFFICIAL_REVIEW`, `verifiedAgainstOfficialSource: false`, `safeToCiteAsOfficial: false` e `effectiveDateDetermined: false`.

## O que NÃO faz

- Não visita sites nem extrai textos de URLs.
- Não atesta origem real do trecho candidato; um URL oficial digitado junto de um trecho arbitrário não é prova de que esse trecho esteja publicado nele.
- Não valida vigência, revogação, consolidação, alterações normativas, efeito temporal nem competência territorial.
- Não autoriza citação jurídica, emissão automática de parecer, indexação RAG, alteração de banco, atualização de petição, nem qualquer ação sobre clientes.

## Próxima homologação

1. Implementar captura autenticada e auditável de fonte oficial com evidência de página/ato, origem verificável e identificação da versão.
2. Conferir número, instrumento, data, redação integral, retificações, alterações e revogações, incluindo data do fato relevante.
3. Submeter divergências ao revisor jurídico humano; não transformar similaridade textual em validação.
4. Somente depois projetar um registro separado de aprovação auditada. Os registros `ctresb/leis` originais deverão continuar inalterados, com seus campos de advertência `false`.

## Teste

`npx vitest run src/enterprise/legislationOfficialReviewPacket.test.ts`

O teste faz parte do workflow `NexJud legislation source staging tests`. Nenhuma fonte oficial real ou caso privado é consultado pelos testes.
