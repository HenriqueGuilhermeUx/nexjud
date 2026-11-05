# Piloto DJEN com advogado

1. Confirmar deploy principal do NexJud e login individual do advogado.
2. Escolher um processo público de 20 dígitos com publicação conferida previamente em https://comunica.pje.jus.br/; nunca usar processo sigiloso.
3. Acessar NexJud > Inteligência de Decisões / DNA do Juiz, colar o número CNJ e clicar em **Consultar DJEN (CNJ)**.
4. Comparar órgão, tribunal, tipo e data de disponibilização com o portal oficial. Resultado vazio refere-se somente à página consultada, não comprova ausência de decisões.
5. Se houver link judicial, conferir inteiro teor no tribunal. Publicação não equivale a decisão fundamentada, nem comprova magistrado.
6. Quando disponível, clicar em **Revisar esta publicação na Biblioteca de Precedentes**; preencher a revisão documental com atestação do advogado. Nenhum registro deve entrar automaticamente no DNA.
7. Relatar apenas status genérico, horário e código de erro, nunca senha/token, nomes ou documentos pessoais.

Erros: invalid_session (novo login no NexJud); authentication_verifier_unavailable (falha técnica); cnj_access_restricted (CNJ 403: não contornar); cnj_query_rejected (parâmetros); cnj_rate_limited (aguardar >=60s); local_throttle (aguardar >=10s); cnj_unexpected_format (não tratar como ausência de publicação).

Aceite: consulta HTTP 200 com registro verificável no portal oficial por advogado autenticado e revisão documental separada. Sem armazenar texto das comunicações. Não é homologação apenas com mocks nem certificação do magistrado.
