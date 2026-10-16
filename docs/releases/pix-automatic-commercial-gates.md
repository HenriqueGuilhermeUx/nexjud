# NexJud - release gate: Pix Automático mensal

A Woovi documenta POST /api/v1/subscriptions com type PIX_RECURRING, frequency MONTHLY, pagador e endereço, dayGenerateCharge e pixRecurringOptions. Para ONLY_RECURRENCY, a primeira cobrança é futura e o mandato autorizado NÃO equivale a pagamento. Cada parcela deve ser liquidada e atribuída ao contrato correto antes de estender o período pago.

Este pacote contém somente montagem de payload e validação pura de competência. Nenhuma requisição à Woovi, alteração SQL/RLS, chave ou usuário real.

Bloqueios antes do primeiro pagamento: (1) Supabase branch requer plano Pro desde US$25/mês, além de US$0,01344/hora da branch, autorização do valor adicional não recebida; (2) criar tabelas isoladas de mandatos/parcelas e paid_until com idempotência e RLS; (3) verificar eventos Pix Automático do webhook existente; (4) ensaiar no sandbox, sem custo real, autorização, liquidação, expiração, duplicata e cancelamento; (5) considerar requisitos Google Play / App Store para venda de recursos digitais dentro do aplicativo.

Referências: https://developers.woovi.com/docs/pix-automatic/pix-automatic-how-to-create e https://supabase.com/pricing
