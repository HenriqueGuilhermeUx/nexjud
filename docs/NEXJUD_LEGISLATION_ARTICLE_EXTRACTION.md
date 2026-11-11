# NexJud article extraction — offline stage

After stageLegislationSourceBatch() accepts a document, use extractLegislationArticles(record)
to segment numbered law articles while retaining the original source text.

This is source-only index preparation. No embeddings, network calls, database writes,
legal interpretation or claims about vigency are generated. Every article carries its
URN, textVersion, sourceUrl and safeToCiteAsOfficial=false.

Limits: 1 MB input, 1000 article result maximum and 60K characters per article.
Nonstandard legislative formats may return no articles and need separate parsing.
The official source and effective historical version must be independently checked
before this data becomes legally citable.

Test: npx vitest run src/enterprise/legislationArticleExtract.test.ts
