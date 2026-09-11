# NexJud × AV Document Intelligence

O NexJud usa o AV Document Intelligence como enriquecimento estruturado da Knowledge Base Jurídica.

## Fluxo

1. Usuário autenticado envia PDF, DOCX, TXT ou imagem para a Knowledge Base.
2. O NexJud mantém o upload e a extração de texto já existentes (pdf.js, Mammoth ou Tesseract).
3. O frontend chama somente o proxy same-origin `/api/av-document-intelligence` com a sessão Supabase do usuário.
4. A Netlify Function valida a sessão diretamente no Supabase do NexJud.
5. Apenas então a função chama o AV Document Intelligence server-to-server usando a chave privada.
6. O resultado estruturado é salvo dentro do metadata do documento no tenant do próprio NexJud.
7. Falha temporária do motor compartilhado não bloqueia o salvamento normal do documento.

## Dados estruturados

- tipo documental
- confidence score
- emitente/destinatário quando detectados
- número do documento
- partes
- datas
- valores
- obrigações/cláusulas sinalizadas
- resumo

## Tipos jurídicos

- petição, sentença, acórdão, parecer e prova → `legal_document`
- contrato → `contract`
- procuração → `power_of_attorney`
- documento societário → `corporate_document`

## Segurança

A chave `AV_DOCUMENT_INTELLIGENCE_KEY` existe apenas como secret da Netlify Function. Ela não é compilada no frontend. O proxy exige sessão Supabase NexJud válida antes de chamar a infraestrutura da Alternative Ventures.
