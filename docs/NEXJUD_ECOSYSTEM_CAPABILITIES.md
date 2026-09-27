# NexJud Ecosystem Capabilities — DocWallet + NexOffice + NextGen

## Princípio

O NexJud continua sendo a fonte canônica de inteligência jurídica. Integrações são aditivas, feature-gated e fail-open para o core: indisponibilidade de DocWallet, NexOffice ou NextGen nunca bloqueia autenticação, processos, Dossiê Vivo, análises, precedentes ou estratégia.

## Responsabilidades

- **NexJud:** processo, Dossiê Vivo, evidência jurídica, precedentes, risco, estratégia, Next Best Legal Action, Outcome Intelligence e Strategic Memory.
- **DocWallet:** documento, metadados estruturados, hash, trilha de auditoria, assinatura eletrônica e inteligência documental.
- **NexOffice:** workspace, identidade federada, tarefas, CRM, operação e orquestração entre capabilities.
- **NextGen:** cobrança/Pix, pagamento, split, conciliação e eventos financeiros.

## Capability 1 — Document Intelligence

Já existe no NexJud o proxy autenticado `POST /api/av-document-intelligence`. O upload normal do NexJud permanece independente; falha do enriquecimento não impede salvar o documento.

Dados que podem enriquecer o Dossiê Vivo:
- tipo documental e confidence;
- partes, datas e valores;
- obrigações e alertas;
- resumo estruturado;
- referência/hash do documento.

Regra: o arquivo bruto permanece no motor documental; o NexJud guarda referência e interpretação jurídica.

## Capability 2 — DocWallet via NexOffice

O backend DocWallet já expõe bridge server-to-server para NexOffice, com isolamento por workspace e idempotência:
- metadata de documento;
- intelligence sem raw text;
- alertas;
- vencimentos;
- análise;
- solicitação de assinatura.

O NexJud não deve duplicar esse bridge. O caminho preferencial é:

```
NexJud → NexOffice workspace → DocWallet capability
```

Isso preserva tenant isolation e evita compartilhar arquivo/texto bruto entre produtos.

## Capability 3 — Assinatura

O NexJud poderá iniciar uma solicitação de assinatura vinculada a uma necessidade jurídica. O DocWallet é a fonte da assinatura e da evidência; o NexJud recebe somente estado, referência, hash e resultado relevantes ao Dossiê.

Assinatura eletrônica com evidências digitais pode ser usada conforme o motor DocWallet disponível.

**ICP-Brasil permanece feature-gated.** A arquitetura DocWallet está preparada para provider ICP, mas assinatura qualificada só pode ser apresentada como ativa quando um provider real estiver configurado e validado. NexJud não deve afirmar ICP ativo antes disso.

## Capability 4 — Obligation Intelligence

Obrigações detectadas em documentos ou no processo são normalizadas no NexJud como sinais jurídicos, sem transformar o NexJud em ERP.

Roteamento:
- prazo/risco jurídico → NexJud;
- documento/assinatura → DocWallet;
- tarefa operacional → NexOffice;
- cobrança/pagamento → NexOffice + NextGen.

Toda ação externa exige confirmação/política própria do produto operacional. A análise jurídica continua disponível mesmo se a execução externa falhar.

## Capability 5 — Financial Outcome

NextGen já possui eventos financeiros e webhooks, incluindo conclusão de cobrança/pagamento. O NexJud deve consumir apenas eventos necessários ao contexto jurídico, preferencialmente via NexOffice.

Exemplos de sinais de retorno:
- `payment.completed`;
- obrigação paga/cumprida;
- cobrança expirada;
- acordo financeiramente cumprido.

Não armazenar credenciais financeiras nem transformar o NexJud em custodiante.

## Capability 6 — Closed-loop Outcome Intelligence

```
recomendação NexJud
→ decisão do advogado
→ ação operacional
→ assinatura / pagamento / cumprimento
→ evento confirmado
→ Outcome Intelligence
→ Strategic Memory
→ próxima recomendação
```

Eventos externos são evidência de resultado, nunca autorização para decisão jurídica autônoma.

## Feature gates

Todas as novas capabilities começam desligadas por padrão:

```
NEXJUD_DOCWALLET_ENABLED=false
NEXJUD_DOCUMENT_SIGNING_ENABLED=false
NEXJUD_OBLIGATION_INTELLIGENCE_ENABLED=false
NEXJUD_FINANCIAL_OUTCOMES_ENABLED=false
NEXJUD_CLOSED_LOOP_OUTCOMES_ENABLED=false
```

A ativação ocorre por capability e ambiente, depois de E2E controlado.

## Critérios de aceite

1. Core NexJud funciona com todas as integrações indisponíveis.
2. Nenhum secret é compilado no frontend.
3. Workspace/tenant isolation é obrigatório.
4. Provisionamento e ações mutáveis são idempotentes.
5. NexJud não recebe raw document quando referência/metadado bastam.
6. NexJud não recebe dados financeiros além do necessário ao resultado jurídico.
7. Falha externa gera estado de integração, não erro global do produto.
8. Outcome Intelligence só grava eventos confirmados e rastreáveis.
