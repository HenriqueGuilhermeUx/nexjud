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
