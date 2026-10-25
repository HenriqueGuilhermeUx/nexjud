# NexJud — piloto de incorporação de legislação em Markdown

Fonte candidata: https://github.com/ctresb/leis.
Este projeto é uma fonte secundária de referência, não a publicação oficial.
O primeiro passo do piloto é o parser src/enterprise/legislationSourcePilot.ts.

## Controles

- Lê apenas texto já obtido por processo autorizado e versionado; não faz crawling.
- Conserva tipo, número, data, UF, situação reportada, URN, link, versão e data de obtenção.
- Todo registro começa com safeToCiteAsOfficial=false e verifiedAgainstOfficialSource=false.
- Atestar versão consolidada, vigência, emendas e revogações consultando a publicação oficial.
- Não assumir que o horário/data de commit no repositório equivale ao início da vigência.
- Sanitizar/renderizar o texto Markdown com regras anti-XSS na camada de UI.
- Não alimentar a base de clientes nem o RAG existente automaticamente.
- Validar deduplicação por URN + fonte + versão + hash e trilha de auditoria antes do importador.
- Acompanhar cobertura por esfera, UF, espécie e data, sem prometer cobertura universal.

## Testes

Execute em ambiente de desenvolvimento:
npx vitest run src/enterprise/legislationSourcePilot.test.ts

## Contrato Agentics

Ferramenta futura legal.norm_source_lookup. Escopo nexjud.legislation.read.
Resultado obrigatoriamente inclui sourceUrl, date, textVersion, statusReported,
verifiedAgainstOfficialSource e safeToCiteAsOfficial.
Não permitir que um agente remova o aviso de validação oficial, crie petições
com alegação de vigência não verificada ou acesse documentos privados por padrão.

Nenhuma migração, alteração em produção, Supabase ou app é realizada neste piloto.
