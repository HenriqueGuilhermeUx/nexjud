# NexJud · Homologação Woovi sem pagamento real

## Objetivo e ordem
1. O Web, PWA e Android já receberam o marco de paridade de acesso.
2. Aplicar os testes de segurança do checkout antes de habilitar uma compra de cliente antigo.
3. Usar apenas conta de teste e credenciais de teste da Woovi, separadas da produção.
4. Para validar o fluxo completo NexJud → banco → webhook → assinatura, usar base isolada e usuário sintético; nunca reaproveitar dados, AppID ou webhook de produção.

## Woovi: passos sem custo nem Pix real
- Acesse https://app.woovi-sandbox.com/ e registre conta de **teste separada** (credenciais de produção não funcionam).
- Em Ajustes → Pix → Configurações avançadas, configure uma conta bancária de teste padrão, se necessário.
- No ambiente de teste, em Administrador → API/Plugins, crie/copie **AppID de teste** (nunca inserir no frontend/código público).
- Cadastre webhook `OPENPIX:CHARGE_COMPLETED` apontando para **um receptor de testes** que valide assinatura; não aponte eventos sintéticos para o banco da NexJud em produção.
- Gere cobrança de teste no ambiente Woovi e simule pagamento pelo detalhe da cobrança. O QR de teste não é um Pix real aceito por banco.
- Alternativamente, no **ambiente de teste apenas**, a Woovi documenta: `GET https://api.woovi.com/openpix/testing?transactionID=<identifier>` com `Authorization: <appID-de-teste>`. Nunca executar usando credenciais de produção.
- Confira webhook assinado, `correlationID`, valores em centavos, estado `COMPLETED`, ambiente `TESTING` e idempotência, sem registrar `payment_orders` reais.
- Nunca simule `paid` direto no banco, não contorne validação de assinatura e não habilite plano a partir do simples clique “Já paguei”.

## Pre-flight obrigatório para habilitação em produção
- PR de proteção de assinaturas legadas: CI de TypeScript, Deno e PostgreSQL descartável aprovados.
- Conferência de assinatura RSA e HMAC dos webhooks Woovi.
- O checkout deve rejeitar usuário ativo pago com `current_period_end IS NULL` **antes** de gerar cobrança Woovi (409). Erros de leitura de assinaturas devem rejeitar (503).
- RPC atômica deve rejeitar cobrança pendente que possa sobrescrever uma assinatura legada ativa, sem liquidar o pedido como pago.
- Testar compra inicial, renovação, upgrade, downgrade e repetição (webhook duplicado) com usuários sintéticos.
- Conferir regras de comercialização e eventuais requisitos de políticas da Google Play; não habilitar compra pelo app Android sem validação específica.
- Não misturar credenciais sandbox/produção, nem publicar dados sensíveis de clientes em logs.

Referências oficiais:
- https://developers.woovi.com/docs/test-environment
- https://developers.woovi.com/docs/test-environment/test-account/test-pay-pix
- https://developers.woovi.com/docs/webhook/seguranca/webhook-public-keys
- https://developers.woovi.com/docs/webhook/examples/webhook-charge-account-type
