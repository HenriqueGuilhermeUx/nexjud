# NexJud Companion iOS — Lite (2 telas), App Review 19/10/2026

## Proposta aprovada como direção de produto

**Somente iOS**, limitado a:
1. **Casos:** consulta de casos já cadastrados na própria conta, com busca e detalhes essenciais; acesso protegido por autenticação e RLS.
2. **Agenda local:** criar e acompanhar tarefas, prazos e audiências; armazenamento em AsyncStorage segregado por UID, sem sincronização com Google/Apple Calendar ou notificações prometidas.

Outros itens operacionais inevitáveis: login em conta existente, logout, suporte, política de privacidade, solicitação de exclusão. **Não há no iOS** IA externa, scanners, compartilhamento de documentos, Studio, ferramentas avançadas, planos, upgrade, cobrança, In-App Purchase ou navegação para a compra no site.

O Android mantém o conteúdo anterior na `mobile/AndroidCompanion.tsx`; app com entrada `App.android.tsx`. iOS carrega apenas `App.ios.tsx -> IosLite.tsx`. O site/PWA permanecem independentes.

O build iOS está configurado como **1.0.4 (6)**, `com.nexjud.companion`; Android `versionCode 7` permanece idêntico.

## Aceite antes do App Review

- Conferir TypeScript/Expo, script `node scripts/validate-ios-lite.mjs`.
- Compilar o IPA com a assinatura Apple já recuperada. Validar `CFBundleShortVersionString=1.0.4`, `CFBundleVersion=6`, `CFBundleIdentifier=com.nexjud.companion`, assinatura, integridade SHA-256.
- Instalar em TestFlight num iPhone e num iPad (inclusive iPad Air); entrar numa conta demo pré-existente com casos **fictícios**.
- Casos: listar/buscar/abrir, voltar, RLS (não ver casos de outro usuário), vazio/rede offline/mensagens de erro.
- Agenda: adicionar compromisso, escolher data/tipo, concluir, excluir, reabrir, confirmar persistência por conta no mesmo dispositivo; esclarecer que agenda é local e não sincroniza com o servidor.
- Conta: privacy, exclusão de conta, suporte, sair; garantir que nenhuma IA, scanner, web checkout, venda, preço ou links para compra apareçam.
- Capturas Apple: duas imagens reais **para iPhone**, duas imagens reais **para iPad suportado**, uma de Casos e outra de Agenda, em uso, sem Android status bar, com dados fictícios. App Store Connect → App Previews and Screenshots → **View All Sizes in Media Manager** para substituir TODAS as imagens antigas nos idiomas e tamanhos obrigatórios.
- Atualizar descrição/subtítulo/keywords de App Store, App Privacy, App Review Info e conta demo para refletir Lite. Não prometer IA, scanner, análise de processo ou recursos pagos neste build.
- Somente então submeter à revisão. Uma aprovação da versão Lite NÃO significa que a Apple aprovará posteriormente IA ou funcionalidades pagas automaticamente; atualizações serão revisadas.

## Texto curto para descritivo da App Store

NexJud Companion é um aplicativo gratuito para profissionais do Direito com conta NexJud existente. Consulte seus casos cadastrados e organize compromissos, tarefas, prazos e audiências em uma agenda pessoal armazenada neste aparelho. Sem compras, planos, IA ou cobranças no aplicativo.

## Resposta atualizada sugerida para App Review

Hello App Review Team,

Thank you for your feedback. We simplified NexJud Companion for iOS significantly.

The new iOS build **1.0.4 (6)** is a free, two-feature companion for existing NexJud accounts:
- **Cases:** read-only access to the user's previously recorded legal cases and their basic details.
- **Personal Agenda:** a simple local schedule for tasks, deadlines and hearings, stored on the user's device.

The iOS app no longer contains AI, document analysis, a scanner, premium features, subscription management, upgrades, paid digital tools, payment processing, purchases, or links to web purchases. Creating an account on the NexJud website is free, and registration is not offered inside this app. Individual lawyers and professional teams may use the website and other NexJud products, but they cannot purchase or unlock any paid features in this iOS build.

The previous iPad issue with the "Analisar documento" button no longer applies because that feature and the button have been removed from the simplified iOS app.

We have updated our iOS and iPadOS screenshots to reflect the actual two-feature application and removed images containing non-iOS status bars. A review account using fictitious data is available in the App Review Information field.

We respectfully request review as a free companion to our web-based legal workflow service under Guideline 3.1.3(f). Please let us know if any further clarification is required.

Best regards,
NexJud Team

**Important:** Send the message only after actual screenshots have been replaced, the build has been uploaded and a demo account has been supplied. Do not claim that screenshots have changed before those actions are verified.
