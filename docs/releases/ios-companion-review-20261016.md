# NexJud Companion iOS — correções App Review 12/10/2026

## Contexto de revisão
- Submission ID: `39d96834-3ccf-4683-8731-a396c2d19592`
- Versão rejeitada: `1.0.1 (3)`; dispositivo de revisão: iPhone 17 Pro Max.
- Motivos: Apple 5.1.1(i)/5.1.2(i), compartilhamento com IA de terceiros; Apple 3.1.1, recursos digitais pagos fora do IAP.
- Este patch prepara **1.0.4 (build 4)**; no Android a versão permanece 1.0.4 (versionCode 7). A correção de `NSPhotoLibraryUsageDescription` permanece no Info.plist.
- Não houve build ou submissão iOS automática por este PR.

## Regra comercial iOS
- iOS como aplicativo **gratuito complementar** para contas previamente criadas. Apenas login; sem tela de cadastro, preços, contratação, upgrade, checkout, pagamento Pix ou links que enviam ao site para compra.
- Links externos a funcionalidades avançadas do Workspace e menu "Abrir Workspace" ficam indisponíveis no iOS; Android não sofre mudança.
- Contas existentes preservam o que o servidor autoriza; não mudar o banco nem assinaturas.
- Fundamentação sugerida ao App Review: avaliar 3.1.3(f) "Free Stand-alone Apps". **Não é garantia**: a Apple pode decidir que a oferta equivale a conteúdo digital pago sujeito a IAP pela 3.1.1/3.1.3(b).

## IA e privacidade
- Chat Legal Brain e Estúdio usam OpenAI via funções de servidor (verificado no código). A decisão é explícita, por usuário, antes de chamar funções externas, e mostra OpenAI e tipos de dados passíveis de envio.
- O mesmo bloqueio de consentimento cobre Análise do Juízo como proteção conservadora; ela não demonstrou chamar API externa no exame atual.
- Botão de revogação: Perfil → Privacidade e IA. Consentimento anterior não implica exclusão automática de dados já transmitidos.
- Política em `/privacy` e `public/privacy/index.html` identifica OpenAI/Supabase, categorias de dados, finalidade, solicitação e revogação.
- Rever contratação/DPA de fornecedores, eventuais fluxos de IA adicionais e declaração de privacidade no App Store Connect antes de aprovar publicação.

## Validação antes de novo envio
1. Testar em iPhone real e no TestFlight com **uma conta de demonstração sem dados reais**. A Apple precisa receber login funcional em App Review Information; não salvar senha no repositório.
2. Navegar login, início, casos, agenda, perfil e suporte: não deve haver botões de registro, preço, compra, upgrade ou link para checkout. Testar "Ferramentas avançadas" inacessíveis no iOS.
3. No primeiro uso de Legal Brain/Estúdio/Análise, recusar consentimento → nenhuma chamada IA ou registro de mensagem deve ocorrer. Autorizar → processamento normal. Revogar → próxima chamada solicita autorização.
4. Conferir Política de Privacidade nos metadados App Store Connect, permissão de dados e descrição, além de `NSPhotoLibraryUsageDescription`, câmera e microfone.
5. Conferir certificados e provisioning profile válidos **antes** de executar `NexJud iOS — API Signing + TestFlight`. Esse workflow pode gerar uma nova identidade Apple e exige backup criptografado; não acioná-lo automaticamente.
6. Recompilar IPA nova com versão/build realmente superiores aos rejeitados, enviar TestFlight, validar e responder ao App Review. Uma alteração no GitHub não modifica o binário já rejeitado.
7. Se a Apple insistir em 3.1.1, solicitar confirmação explícita sobre o enquadramento em 3.1.3(f). Caso não se aplique, avaliar StoreKit/IAP ou reduzir o escopo do Companion a recursos efetivamente gratuitos.

## Sugestão de resposta à equipe App Review (apenas após novo build validado e submetido)
> Thank you for reviewing NexJud Companion. We have updated the iOS app to operate as a free stand-alone companion for existing NexJud web accounts. We removed account-creation and external purchasing paths, including links to the full paid Workspace. There are no in-app purchases, external purchase calls to action, or subscription upgrades in the iOS app. We request review under guideline 3.1.3(f). We understand that qualification is subject to App Review determination.
>
> We also added an explicit consent prompt before third-party AI processing. It names OpenAI and explains what may be shared, including user prompts, related conversation history, case details, process records, and relevant document excerpts. Users can decline and revoke permission from Profile, and the privacy policy was updated to describe the service providers, data uses and available privacy controls.
>
> This change is included in iOS version 1.0.4 (build 4). A review/demo account is supplied separately in App Store Connect. Please let us know if further adjustments are needed.
