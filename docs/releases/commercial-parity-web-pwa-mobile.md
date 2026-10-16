# NexJud · Jornada simples nas três experiências
Marcos isolados; não publicar tudo em produção sem confirmação dos checks.

## Site e PWA (mesmo frontend)
- Entrar/criar conta → Dashboard → informar CNJ → consultar dados públicos.
- A busca inicial não pede gravação do processo sem consentimento do advogado.
- O módulo Análise do Juízo mostra evidências e seus limites; documentos fornecidos pelo advogado não são verificados.
- Assinatura e checkout Pix: mostrar status real, não liberar acesso apenas com clique em “Já paguei”.
- Revisão acessível pelo mesmo endereço no navegador/PWA.

## App nativo Companion
- Início: CNJ, análise de documentos, IA e casos usando ações com nomes diretos.
- Perfil: mostrar plano, estado real e validade do teste gratuito. Permitir atualização manual de status sem mudar assinatura.
- A compra não é iniciada dentro do app. Conferir regras das lojas antes de ativar cobrança nativa.
- Conferir fontes antes de tomar decisão jurídica; DataJud metadata não é inteiro teor.

## Critérios restantes para comercializar
1. Woovi: evento assinado e sandbox homologados, plano liberado somente após confirmação.
2. Assinaturas: registrar período pago e política de renovação/vencimento, ainda não implantados.
3. Supabase: staging separado, RLS e APIs verificados com identidades de teste sem dados reais.
4. Builds instaláveis assinados Android/iOS, TestFlight/Play Console e revisão das lojas.


## Marco de publicação 2026-10-16 — paridade funcional acessível
- Web: o Workspace mantém os módulos avançados existentes sem refazer sua implementação; permissões e assinaturas seguem o controle servidor/assinatura.
- PWA: atalho “Ferramentas avançadas” no início, perfil e manifesto instalável, levando aos módulos reais do Workspace, e estado de assinatura validado conforme o mesmo helper do Web (trial nunca é pago).
- Android: módulo “Ferramentas avançadas” abre os recursos completos no navegador oficial, com aviso de que pode ser necessário login no browser. Análise CNJ, casos, scanner, IA e agenda permanecem nativos. A tela de assinatura nunca classifica trial legado como plano pago.
- Android Expo: versão 1.0.4, versionCode local 7 antes de eventual autoIncrement do EAS. É obrigatório confirmar que o código final supera o já publicado na Google Play.
- Acesso externo aos módulos Web não significa paridade de telas inteiramente nativas; essa diferença deve permanecer transparente ao usuário.
- **Não ativar cobrança/compra dentro do aplicativo Android**; seguir políticas de cobrança das lojas e revisão comercial.
- Checagem de release: CI Web + CI Mobile verdes, Deploy Preview Web validado, login/rotas/autenticação testados em dispositivo, AAB release **assinado com chave de upload original**, fingerprint + package conferidos e instalação/upgrade testado.
- Sem aprovação expressa do AAB no Play Console ou artifact do workflow não declarar app Android publicado. O iOS permanece para o próximo marco.
- Pagamentos: **não homologar com assinantes legados** enquanto o guard da issue #74 não estiver validado. Nenhum pagamento real pode ser criado neste checklist.


## PWA = app instalável, NÃO site reduzido (diretriz UX de 16/10/2026)
- A rota `/app` tem interface mobile específica, independente do dashboard Web.
- Barra inferior com 5 abas permanece visível também em Scanner, Análise, Estúdio, Ferramentas, Dossiê e Audiência. A aba ativa indica a área de origem.
- Layout próprio para toque, safe areas iOS/Android, tela cheia sem scroll horizontal, contraste e estados de aba acessíveis.
- Atalhos e funcionalidades nativos do PWA devem manter interação e linguagem de aplicativo; **não** reutilizar telas desktop encolhidas.
- Funcionalidades mais avançadas ainda abrem o Workspace Web, o que é uma lacuna real de paridade visual. Qualquer futura incorporação deve ser uma tela PWA nativa com validação funcional, não um iframe que apenas embute o desktop.
- Preservar o domínio do site público e o PWA como experiências distintas apesar do mesmo deploy, com revisão de login, cache/atualização e instalação.
