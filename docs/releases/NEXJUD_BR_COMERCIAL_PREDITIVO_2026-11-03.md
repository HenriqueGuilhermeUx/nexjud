# NexJud Brasil — Plano de entrega comercial e IA preditiva (03/11/2026)

## O que esta branch altera
1. Landing apresenta caminhos para profissional autônomo, escritório em expansão e organização jurídica Enterprise.
2. A landing não publica preço mensal divergente do checkout: direciona o comprador para `/pricing` (a fonte do preço efetivo).
3. O painel inicial não exibe números do modelo generativo como se fossem probabilidade de êxito validada.
4. Os sinais de andamentos DataJud são identificados como **sinais processuais**, não resultados de julgamentos.

## Importantíssimo: não liberar como predição
Os campos históricos `success_probability`, `jurisprudence_prediction` e `favorableRate` ainda existem em geração, persistência, PDFs e outras telas. Esta branch reduz exposição no painel principal, mas **não certifica predição**, não remove campos do banco e não valida exportações. Antes de publicar como preditivo:
- Mapear todas as leituras/escritas e exportações dos campos antigos e desabilitar sua apresentação como probabilidade de êxito.
- Exigir evidência com inteiro teor, resultado observado, órgão julgador, data e proveniência.
- Realizar teste temporal fora da amostra, calibração, comparação com baseline e auditoria humana antes de exibir taxa.
- Suprimir taxa para amostras insuficientes e casos fora da distribuição, sem inventar 0%.

## Homologação comercial na produção existente (conta controlada)
- [ ] Visita anônima landing → planos → login → trial elegível; confirmar preço final e contrato, não alterar cobrança automaticamente.
- [ ] Usuário autorizado → Legal Brain → upload PDF/DOCX e OCR → citar documentos verificáveis → revisão de minuta.
- [ ] CNJ/DataJud → conferir processo e origem → dados não encontrados não criam precedente fictício.
- [ ] Criar caso → histórico → sair/entrar → isolamento entre contas de teste.
- [ ] Conferir PDF, análises anteriores, telas móveis/PWA: nenhuma taxa AI inventada pode aparecer como jurimetria calibrada.
- [ ] Pix Woovi: teste de elegibilidade e status com ordens de sandbox/ambiente autorizado; não realizar cobrança real no teste.
- [ ] Registros de auditoria, erro fail-closed, limites do plano e custo de IA.
- [ ] Enterprise: permissões e importações somente em ambiente isolado; a PR #61 permanece draft.

## Release gates
- Build TypeScript/Vite e testes passam no SHA da branch.
- Responsividade e acessibilidade com validação visual Web/PWA.
- Aprovação de produto e revisão jurídica da copy e das limitações.
- Verificação do deploy associado ao SHA (Netlify) e smoke test após publicar.
- Não alterar iOS, NexJud USA, chaves, dados reais, fluxos de pagamentos ou migrações.

## Segmentação, sem prometer capacidades inexistentes
**Solo / pequeno**: documentos, assistência jurídica, minutas e pesquisa, após smoke test.
**Escritório**: reutilização de contexto, organização de casos, análise de cenários, após smoke test.
**Enterprise**: diagnóstico, proposta e piloto, **não** autoativar multiusuário, RLS e importações ainda não homologados.

## Próximo incremento técnico de predição
Definir um recorte jurídico brasileiro (classe, tribunal, órgão e desfecho observável), dataset versionado e auditável, rótulos revisados, datas e elegibilidade; implementar baseline com avaliação cronológica, Brier/log-loss/calibração e abstention, sem percentuais liberados a clientes até aprovação.
