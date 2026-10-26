# NexJud — ingestão legislativa: segundo estágio

O arquivo src/enterprise/legislationBatchStaging.ts implementa a preparação
em memória de até 50 documentos Markdown já obtidos de maneira autorizada.

- Calcula hash SHA-256 sobre o texto e metadados; preserva URN, link da
  fonte e versão com os campos do parser anterior.
- Elimina duplicatas idênticas e coloca conflitos no fluxo de revisão manual.
- Identidade é baseada na URN ou jurisdição + tipo + número + data.
- Não faz rede, não consulta o GitHub e não escreve no banco/Supabase.
- Para operacionalizar: importador externo controlado; checkpoints,
  reconhecimento de versões históricas, verificação oficial e índice
  de busca com segregação por fonte/versão.
- Documento importado não passa automaticamente a ser oficialmente verificado.

Executar: npx vitest run src/enterprise/legislationSourcePilot.test.ts src/enterprise/legislationBatchStaging.test.ts.
