# NexJud Companion — Rascunho de Segurança dos Dados

> Este documento é um rascunho operacional para preenchimento do formulário da Google Play. Deve ser conferido contra a versão final do aplicativo e os contratos dos provedores antes do envio.

## Dados coletados ou processados

### Informações pessoais
- Nome
- Endereço de e-mail
- Identificador interno do usuário
- Informações de assinatura e status do plano

Finalidades: gerenciamento da conta, autenticação, prestação do serviço, suporte e prevenção de fraude.

### Arquivos e documentos
- PDFs
- DOCX
- Imagens fotografadas ou selecionadas
- Conteúdo jurídico inserido pelo usuário

Finalidades: armazenamento solicitado pelo usuário, OCR, organização, pesquisa, análise jurídica assistida por IA e sincronização com o Workspace.

### Atividade no aplicativo
- Perguntas ao Legal Brain
- Histórico de conversas
- Casos acessados
- Registros técnicos de operação

Finalidades: fornecer as funções solicitadas, manter continuidade, segurança, diagnóstico e melhoria do produto.

### Dados de câmera e arquivos
A câmera e o seletor de arquivos são utilizados somente após ação do usuário para digitalizar ou importar documentos.

## Compartilhamento
Dados podem ser processados por operadores contratados para:
- autenticação;
- banco de dados e armazenamento;
- inteligência artificial;
- infraestrutura e monitoramento;
- pagamentos e suporte.

Não declarar venda de dados. Confirmar que nenhum provedor utiliza o conteúdo para publicidade comportamental.

## Segurança
- Dados criptografados em trânsito por HTTPS.
- Controle de acesso autenticado.
- Políticas de segregação por usuário no banco.
- Exclusão de conta disponível por URL pública.
- Usuário pode solicitar remoção dos dados.

## Dados obrigatórios ou opcionais
- E-mail e autenticação: obrigatórios para uso do serviço.
- Documentos, casos e perguntas: opcionais, enviados pelo usuário conforme a funcionalidade desejada.
- Câmera: opcional e solicitada somente ao usar o scanner.

## Retenção
Manter enquanto a conta estiver ativa ou pelo período necessário à prestação do serviço, cumprimento de obrigações legais, prevenção de fraude e defesa de direitos. Após solicitação validada, excluir ou anonimizar conforme a Política de Privacidade.

## Público infantil
O aplicativo não é direcionado a crianças. O público-alvo é composto por profissionais maiores de 18 anos.

## Pontos para validação final
- Confirmar todos os SDKs incluídos no AAB final.
- Confirmar se crash reporting ou analytics serão habilitados.
- Confirmar o fluxo final de pagamentos.
- Confirmar os provedores de IA usados em produção.
- Confirmar a URL pública definitiva da Política de Privacidade.
