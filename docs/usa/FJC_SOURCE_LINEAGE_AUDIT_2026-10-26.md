# NexJud USA — FJC IDB source lineage review (offline only)

Status: **engineering review packet; NOT a verified FJC ingestion, source authenticity attestation, legal authorization, or model approval.** Applies solely to the isolated NexJud USA PR #84. No datasets or clients are bundled.

## Official references (research, checked October 26, 2026)

- [FJC Integrated Database (IDB) landing page](https://www.fjc.gov/research/idb): the FJC publishes case data and associated codebooks, and links to SAS or tab-delimited downloads via a JavaScript interface.
- [FJC IDB Research Guide](https://www.fjc.gov/sites/default/files/IDB-Research-Guide.pdf): describes changes to codebooks and data collection, quarterly updates, changes to case records across snapshots, and caveats for longitudinal interpretation.

The landing-page URL is **not** a cryptographic digest, artifact download URL, license grant, or evidence that any particular local bytes came from the FJC.

## Required external, operator-controlled release packet

Before considering a real dataset for offline research:

1. A designated acquisition operator obtains the **specific raw original FJC release artifact** from a verified provider connection; independently record the artifact URL, retrieval timestamp, TLS/source provenance and exact SHA-256. **This acquisition step does not yet exist.**
2. Preserve original bytes in independently controlled, immutable storage and pin their SHA-256 outside the converted dataset/manifest. The new `fjcSourceLineagePreflight.ts` can verify supplied original bytes against the pinned digest but cannot authenticate the remote publisher.
3. Pin the exact **codebook release/revision**, assess variable-code and reporting-period changes, record approved field mapping. Do not guess which field represents termination, outcome or judicial success.
4. Freeze and independently review a deterministic conversion procedure and its hash; compare its output against a second conversion run when feasible. The preflight currently only checks a **declared conversion-procedure digest**, not actual reproducibility.
5. Hash the **exact converted JSON bytes**. The pinned converted SHA-256 must match the parser manifest and the independently selected research configuration before research proceeds.
6. Keep three separately reviewed evidence records for raw-source capture, field mapping and rights assessment. Enforce distinct source reviewer, mapping reviewer, rights reviewer and converter-operator IDs. The preflight only enforces **structural distinctness**: it does not prove human identity or that reviews occurred.
7. Have counsel/authorized data governance assess allowed research, retention, redistribution and commercial purposes. A boolean review flag **does not establish license rights**.
8. Archive separately dated snapshots *as collected*. **Retrospective reconstruction from a newer IDB release is not an independent historical snapshot.** FJC notes that quarterly updates can revise or replace case details.
9. Independently validate temporal cohorts, missingness, censoring, codebook shifts, external model calibration and bias; do not derive individualized win/loss probabilities from administrative case-termination outcomes.

## Code contract

- `src/intelligence/usa/fjcSourceLineagePreflight.ts`: compare independently supplied raw-release bytes and converted bytes with declared external review hashes, trusted-host-shaped URLs, dataset/revision/date and distinct reviewer IDs. Reject on any mismatch.
- `src/intelligence/usa/fjcByteBoundResearch.ts`: optional sixth `lineage` argument. Invalid supplied lineage rejects the report. Omission keeps existing isolated synthetic tests working and reports `sourceLineagePreflightStatus: "NOT_SUBMITTED"`.
- `src/intelligence/usa/fjcSourceLineagePreflight.test.ts` and `fjcByteBoundResearch.test.ts`: synthetic benign and adversarial fixtures. Never use real judicial data or live upstream credentials.

A successful packet returns `DECLARED_REVIEW_PACKET_HASHES_MATCH`, which means exactly that the supplied bytes **match the declared independently managed packet**. It does not certify actual FJC release origin, independent signer identity, reviewer signature, legal-use rights, converter reproducibility, or real predictive validity.

All flags for certified publisher authenticity, legal-use certification, historical snapshots and user-facing legal predictions remain **false**.

## Remaining blockers for real FJC evidence

- Provider-authenticated, read-only download with trustworthy artifact-identity evidence.
- Independently maintained, versioned source registry with signed reviewer records and immutable evidence storage.
- Reproduced converter outputs, codebook audits and license/legal review.
- Frozen historical datasets from distinct observation times, external validation and statistical governance.
- Isolation of US storage/identity plus privacy/security review, before any production environment is considered.

**Not authorized:** merge, deploy, changes to Brazilian systems, use of real personal or client data, provision of paid PACER services, or public case-specific predictions.


## Increment: replay determinístico da conversão (26/10/2026)

Arquivo `src/intelligence/usa/fjcConversionReplay.ts`, integrado como `lineage.conversionReplay` no relatório offline `buildUSByteBoundCivilResearch`.

1. O preflight anterior **deve aprovar primeiro** correspondência entre bytes originais, convertidos, revisão e pacote de auditoria. Uma falha impede qualquer execução do conversor.
2. O adaptador offline fornece o artefato de implementação auditado, cujo SHA-256 precisa coincidir com `converterProcedureSha256`. O artefato é tratado apenas como evidência estrutural de integridade.
3. Uma função de conversão injetada por serviço **confiável** é executada duas vezes, recebendo cópias independentes dos mesmos bytes originais. Ambas devem produzir uma saída **idêntica byte a byte** ao arquivo convertido congelado, sem modificar entrada nem artefato de referência.
4. Se a função falhar, alterar os bytes de entrada, produzir uma saída intermitente ou divergir do resultado esperado, o relatório inteiro falha, antes de gerar pesquisa.
5. A resposta distingue `conversionReplayStatus: NOT_RUN` de `REPLAY_BYTE_IDENTICAL`. O último estado significa **somente consistência de reprodução no mesmo adaptador injetado**; não é uma implementação independente de outro fornecedor.
6. Não foi implementado um executor isolado que possa atestar que o código efetivamente executado corresponde aos bytes de artefato revisados. Também não foram autenticados arquivos reais do FJC, identidades dos auditores, direitos de uso ou snapshots históricos. Assim, `executedConverterArtifactAttested` permanece false.

**Invariantes:** nenhum dataset real é baixado, nenhum segredo é acessado, nenhuma previsão individual é divulgada e a PR permanece draft. Os testes novos são sintéticos e incluem adulteração dos arquivos, resultado não determinístico, exceções da conversão e mutação dos buffers.


## Revisões criptográficas de auditoria (incremento offline)

Implementação `src/intelligence/usa/fjcSignedReviewAudit.ts` — **não é serviço de identidade, não assina em produção e não escreve em banco**.

- A revisão vinculada a um pacote FJC congelado tem sequência inteira positiva, digest anterior e data de assinatura UTC. O `expectedSequence` e `expectedPreviousDigest` devem vir de um registro independente controlado no servidor; **não podem ser aceitos a partir do pedido do usuário**. Nenhum ledger real foi provisionado.
- Três *service reviewer keys* ECDSA P-256/SHA-256 distintas, para `source`, `mapping` e `rights`, são verificadas sobre bytes canônicos versionados que incluem o pacote integral, revisão, digest anterior, data, função do revisor, ID e ID de chave. A correspondência de cada chave pública com um hash SPKI aprovado é verificada.
- A ingestão exige chaves ativas no instante de observação do servidor, sem expiração ou revogação, além de datas de assinatura válidas. Qualquer divergência de função, identidade declarada, SHA, revisão, link anterior, assinatura ou chave bloqueia a operação (*fail closed*).
- A saída `linkedRecordDigest` é somente impressão digital do registro. **Não é prova de escrita imutável, consenso ou publicação.** A verificação afirma que chaves públicas de serviço previamente fixadas validaram as mensagens; **não comprova identidades humanas**, revisão efetiva ou direitos legais.
- O parâmetro opcional `lineage.signedReview` em `buildUSByteBoundCivilResearch` preserva os testes sintéticos legados. Quando fornecido, evidência inválida **bloqueia** o relatório. A resposta identifica `signedReviewStatus: NOT_SUBMITTED` ou `THREE_PINNED_REVIEW_SIGNATURES_VERIFIED`. Isso não habilita previsão individual ou validação jurídica.

Próximas dependências externas: registro de chaves controlado por operadores independentes, comprovação de identidade/mandato dos revisores, rotação e revogação auditáveis, ledger append-only com checkpoints assinados, aquisição oficial autenticada do FJC, revisão de direitos e validação estatística externa. **Sem merge, deploy ou migração produtiva nesta etapa.**
