# NexJud - Supabase Edge Functions Deployment Guide

## Arquivos Criados

1. `supabase/functions/analyze-case/index.ts` - IA Preditiva (usa CNJ + OpenAI)
2. `supabase/functions/search-jurisprudence/index.ts` - Busca Jurisprudência (usa Escavador + OpenAI)

## Como Deployar as Edge Functions

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Linkar ao projeto
supabase link --project-ref zoruralbsxrbsaicihzu

# 4. Deployar as functions
cd supabase
supabase functions deploy analyze-case
supabase functions deploy search-jurisprudence

# 5. Configurar secrets (variáveis de ambiente)
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set CNJ_API_KEY=your-cnj-key
supabase secrets set ESCAVADOR_API_KEY=your-escavador-key
```

### Opção 2: Via Dashboard (Manual)

1. Acesse https://supabase.com/dashboard/project/zoruralbsxrbsaicihzu
2. Vá em **Edge Functions** no menu lateral
3. Clique em **New Function**
4. Crie cada function copiando o conteúdo dos arquivos:
   - `supabase/functions/analyze-case/index.ts`
   - `supabase/functions/search-jurisprudence/index.ts`
5. Adicione os Secrets nas configurações da function

## Variáveis de Ambiente Necessárias no Supabase

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Chave da OpenAI (GPT-4) |
| `CNJ_API_KEY` | Chave da API CNJ DataJud |
| `ESCAVADOR_API_KEY` | Chave da API Escavador |
| `SUPABASE_URL` | Já configurado automaticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | Já configurado automaticamente |

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

## After Deploying

1. Deploy das functions ✅
2. Configurar secrets no Supabase ✅
3. Trigger new build no Netlify (Deploys → Trigger deploy)

O frontend já está configurado para chamar essas functions automaticamente.