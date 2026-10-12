# NexJud Predictive Intelligence — critérios de ativação

## Princípio
Nunca exibir probabilidade de vitória, score recursal ou perfil de magistrado como previsão validada apenas a partir de movimentações do DataJud, dados simulados ou frequência histórica.

## Gate atual
`assessPredictiveReadiness` contabiliza documentos únicos, exige origem rastreável, qualidade alta, data, classe, órgão julgador, fundamentação e resultado observado. Retorna **eligible=false por padrão**, mesmo quando há amostra suficiente: este é um gate preparatório, não um classificador treinado.

## Para habilitar predição futuramente
- Definir um alvo jurídico mensurável (classe, recurso, órgão, período e resultado), com base legal e política de retenção.
- Obter decisões públicas com inteiro teor e resultado verificável, deduplicar por decisão/processo e avaliar cobertura e viés.
- Treinar baseline e validar em divisão temporal sem vazamento entre decisões do mesmo processo.
- Documentar Brier score, log loss, calibração, intervalos de incerteza, drift e métricas por grupo; obter aprovação jurídica.
- Exibir probabilidade somente após revisão formal, com versão do modelo, tamanho da amostra, fontes e limites.
- Se faltarem evidências, apresentar **dados insuficientes** e não extrapolar.

## Operação
Mudança isolada em branch de feature; sem deploy de produção, sem alterações no PWA/Google Play ou Supabase. Auditoria E2E de autenticação, funções remotas, cobranças e RLS permanece necessária.
