# NexJud 1.0 — Launch Audit

Use este documento como checklist oficial de estabilização e lançamento.

## 1. Autenticação e acesso

- [ ] Cadastro cria perfil corretamente
- [ ] Trial Premium de 7 dias inicia automaticamente
- [ ] Onboarding redireciona usuários novos
- [ ] Login funciona após onboarding
- [ ] Logout encerra a sessão
- [ ] Trial expirado abre paywall
- [ ] Premium ativo libera acesso
- [ ] Reset de senha validado

## 2. Documentos e Knowledge Base

- [ ] Upload TXT
- [ ] Upload PDF com camada de texto
- [ ] Upload DOCX
- [ ] Upload PNG/JPG com OCR
- [ ] Storage `knowledge-files` validado
- [ ] Documento salvo em `knowledge_documents`
- [ ] Chunks criados em `knowledge_chunks`
- [ ] Embeddings gerados
- [ ] Busca semântica retorna trechos relevantes
- [ ] Erros de arquivo exibem mensagem compreensível

## 3. Legal Brain 2.0

- [ ] Document Review responde objetivamente
- [ ] Consulta Jurídica não ativa Strategy Engine sem necessidade
- [ ] Estratégia Processual usa Deal Breaker, Litigation Chess e Victory Plan
- [ ] Jurisprudência salva entra no contexto
- [ ] Precedentes entram no contexto
- [ ] Processos CNJ entram no contexto
- [ ] Memória Jurídica entra no contexto
- [ ] Histórico do chat preserva continuidade
- [ ] `contextUsed` retorna contagens corretas
- [ ] Fontes consideradas aparecem na interface
- [ ] Modo da resposta aparece corretamente
- [ ] Nenhuma fonte inexistente é apresentada como utilizada

## 4. Cenários jurídicos obrigatórios

- [ ] Estatuto com assinatura conjunta
- [ ] Contrato com cláusula de multa
- [ ] Documento incompleto
- [ ] Documentos contraditórios
- [ ] Pergunta puramente documental
- [ ] Pedido de estratégia processual
- [ ] Pedido de fundamentação jurisprudencial
- [ ] Precedente qualificado aplicável
- [ ] Precedente com distinguishing
- [ ] Processo CNJ com movimentação recente
- [ ] Pergunta sem contexto suficiente
- [ ] Tentativa de induzir a IA a inventar fonte

## 5. UX

- [ ] Landing comunica valor em menos de 30 segundos
- [ ] CTA de Trial aponta para o fluxo correto
- [ ] Onboarding salva perfil, área e objetivo
- [ ] Dashboard orienta por tarefas
- [ ] Menu tem descrições curtas
- [ ] Chat mostra estados de carregamento
- [ ] Chat mostra modo da resposta
- [ ] Chat mostra fontes consideradas
- [ ] Estados vazios são claros
- [ ] Mensagens de erro são compreensíveis
- [ ] Layout mobile validado

## 6. Pagamentos

- [ ] Geração de Pix Woovi
- [ ] QR Code exibido
- [ ] Código copia e cola exibido
- [ ] Webhook atualiza assinatura
- [ ] `subscriptions` é atualizada após pagamento
- [ ] `payment_orders` registra pedido
- [ ] Premium é reconhecido no Dashboard
- [ ] Pagamento duplicado não cria assinatura duplicada

## 7. Segurança e LGPD

- [ ] RLS ativa em todas as tabelas de usuário
- [ ] Usuário não lê dados de outro usuário
- [ ] Storage protegido por `user_id`
- [ ] Edge Functions validam usuário quando necessário
- [ ] Secrets não aparecem no frontend
- [ ] Logs não expõem documentos completos
- [ ] Política de Privacidade publicada
- [ ] Termos de Uso publicados
- [ ] Aviso de apoio jurídico e revisão humana exibido

## 8. Performance

- [ ] Tempo médio do Chat registrado
- [ ] Tempo médio de OCR registrado
- [ ] Contexto enviado ao modelo limitado
- [ ] Consultas Supabase possuem índices
- [ ] PDFs grandes possuem limite definido
- [ ] Falha de embedding não interrompe resposta textual
- [ ] Netlify build sem erros TypeScript

## 9. Go-live

- [ ] Conta nova testada do início ao fim
- [ ] Conta com trial expirado testada
- [ ] Conta Premium testada
- [ ] Teste em Chrome desktop
- [ ] Teste em celular
- [ ] Domínio e HTTPS validados
- [ ] Analytics configurado
- [ ] Canal de suporte publicado
- [ ] Vídeo de demonstração pronto
- [ ] Primeiro grupo beta definido

## Critérios de aprovação

O NexJud 1.0 somente deve ser marcado como pronto quando:

1. Todos os itens críticos de Auth, Legal Brain, pagamento e segurança estiverem aprovados.
2. Os 12 cenários jurídicos obrigatórios tiverem resultado esperado.
3. O fluxo completo de um usuário novo funcionar sem intervenção técnica.
4. Não houver erro de build ou erro 500 recorrente nas Edge Functions.
