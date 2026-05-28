# NexJud - Supabase Edge Functions Deployment Guide

## Arquivos Criados (Formato Supabase Deno)

1. `supabase/functions/analyze-case/index.ts` - IA Preditiva (usa CNJ + OpenAI)
2. `supabase/functions/search-jurisprudence/index.ts` - Busca Jurisprudência (usa Escavador + OpenAI)

## Como Deployar as Edge Functions

### Via Dashboard Supabase (Manual)

1. Acesse https://supabase.com/dashboard/project/zoruralbsxrbsaicihzu
2. Vá em **Edge Functions** no menu lateral
3. Clique em **New Function**
4. Nome: `analyze-case` → Cole o conteúdo de `supabase/functions/analyze-case/index.ts`
5. Nome: `search-jurisprudence` → Cole o conteúdo de `supabase/functions/search-jurisprudence/index.ts`

### Via CLI (se preferir)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login e deploy
supabase login
supabase link --project-ref zoruralbsxrbsaicihzu

# Deploy das functions
supabase functions deploy analyze-case
supabase functions deploy search-jurisprudence

# Configurar secrets
supabase secrets set OPENAI_API_KEY=sua-chave
supabase secrets set CNJ_API_KEY=sua-chave
supabase secrets set ESCAVADOR_API_KEY=sua-chave
```

## Variáveis de Ambiente Necessárias (Secrets no Supabase)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Chave da OpenAI (GPT-4) |
| `CNJ_API_KEY` | Chave da API CNJ DataJud |
| `ESCAVADOR_API_KEY` | Chave da API Escavador |
| `SUPABASE_URL` | ✅ Já configurado automaticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Já configurado automaticamente |

## Adicionar Secrets no Dashboard

1. Supabase Dashboard → Settings → Edge Functions
2. Ou: `supabase secrets set OPENAI_API_KEY=xxx`

## Endpoints Criados

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/analyze-case` | POST | Análise preditiva de processos |
| `/functions/v1/search-jurisprudence` | POST | Busca de jurisprudência |

## Formato das Requisições

### analyze-case
```json
{
  "caseNumber": "0001234-56.2020.1.01.3800",
  "caseDescription": "Descrição do caso...",
  "caseType": "TRABALHISTA",
  "userId": "user-uuid"
}
```

### search-jurisprudence
```json
{
  "theme": "Rescisão de contrato",
  "court": "STJ",
  "period": "5years",
  "camara": "1ª Turma",
  "materia": "trabalhista",
  "userId": "user-uuid"
}
```

## Fluxo Após Deploy

1. ✅ Deploy das Edge Functions
2. ✅ Configurar secrets (OPENAI_API_KEY, CNJ_API_KEY, ESCAVADOR_API_KEY)
3. ✅ Trigger build no Netlify (Deploys → Trigger deploy)
4. ✅ Testar login e análise