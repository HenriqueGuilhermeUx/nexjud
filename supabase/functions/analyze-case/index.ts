// Supabase Edge Function: IA Preditiva Jurídica
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@^1";

interface AnalyzeCaseInput {
  caseNumber: string
  caseDescription: string
  caseType: string
  userId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const cnjKey = Deno.env.get('CNJ_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { caseNumber, caseDescription, caseType, userId }: AnalyzeCaseInput = await req.json();

    // 1. Buscar dados reais do processo via CNJ DataJud
    let caseData = {
      judge: 'Juiz não identificado',
      court: 'Tribunal não identificado',
      parts: [],
      movements: []
    };

    try {
      const processNumberCNJ = caseNumber.replace(/\D/g, '');
      const cnjResponse = await fetch(
        `https://api.cnj.jus.br/core/v2/processos/${processNumberCNJ}`,
        {
          headers: {
            'Authorization': cnjKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (cnjResponse.ok) {
        const cnjData = await cnjResponse.json();
        caseData = {
          judge: cnjData?.data?.movimentos?.slice(-1)[0]?.usuario?.nome || 'Juiz não identificado',
          court: cnjData?.data?.tribunal?.nome || 'Tribunal não identificado',
          parts: cnjData?.data?.partes || [],
          movements: cnjData?.data?.movimentos || []
        };
      }
    } catch (cnjError) {
      console.log('CNJ API não disponível, usando análise padrão');
    }

    // 2. Análise via OpenAI (GPT-4o-mini)
    const prompt = `Você é um assistente jurídico especializado em análise preditiva de processos brasileiros.

Analise o caso abaixo e forneça uma análise completa:

**Número do Processo:** ${caseNumber}
**Tipo:** ${caseType}
**Descrição:** ${caseDescription}

**Dados do Juiz (se disponíveis):**
- Juiz: ${caseData.judge}
- Tribunal: ${caseData.court}

Retorne EXATAMENTE neste JSON (sem markdown, sem code blocks):
{
  "successProbability": número de 0 a 100,
  "riskLevel": "BAIXO" ou "MÉDIO" ou "ALTO",
  "recommendation": "texto da recomendação",
  "goldSuggestions": ["sugestão 1", "sugestão 2", "sugestão 3", "sugestão 4"],
  "judgeDNA": {
    "padroes": ["padrão 1", "padrão 2", "padrão 3", "padrão 4"],
    "perfil": "perfil do juiz",
    "nivelExigencia": "Alto/Médio/Baixo"
  },
  "redTeam": {
    "fraquezasDoSeuCaso": ["fraqueza 1", "fraqueza 2", "fraqueza 3"],
    "probabilidadeDeNegacao": número de 0 a 100,
    "comoCorrigir": ["correção 1", "correção 2", "correção 3"]
  },
  "heatmap": {
    "zonaVerde": ["argumento 1", "argumento 2", "argumento 3"],
    "zonaAmarela": ["argumento 1", "argumento 2"],
    "zonaVermelha": ["argumento 1", "argumento 2"]
  }
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente jurídico especializado. Retorne apenas JSON válido, sem formatação extra.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    let analysisResult: any;

    if (openaiResponse.ok) {
      const openaiData = await openaiResponse.json();
      const content = openaiData.choices?.[0]?.message?.content || '{}';

      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?|```\n?/g, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '');
      }

      analysisResult = JSON.parse(cleanContent);
    } else {
      // Fallback se OpenAI falhar
      analysisResult = {
        successProbability: 65,
        riskLevel: 'MÉDIO',
        recommendation: 'Caso requer análise detalhada. Recomenda-se aprofundar fundamentação.',
        goldSuggestions: ['Buscar precedentes do STJ', 'Apresentar laudos periciais', 'Citar jurisprudência consolidada'],
        judgeDNA: {
          padroes: ['Prefere decisões fundamentadas', 'Avalia impacto social', 'Dá peso a precedentes'],
          perfil: 'Garantista',
          nivelExigencia: 'Médio'
        },
        redTeam: {
          fraquezasDoSeuCaso: ['Argumentos genéricos', 'Falta de provas documentais'],
          probabilidadeDeNegacao: 35,
          comoCorrigir: ['Coletar mais provas', 'Buscar precedente específico']
        },
        heatmap: {
          zonaVerde: ['Direito líquido e certo', 'Prova documental robusta'],
          zonaAmarela: ['Argumentos econômicos', 'Tese nova sem precedentes'],
          zonaVermelha: ['Arguição genérica', 'Súmula vinculante violada']
        }
      };
    }

    // 3. Montar resultado completo
    const fullResult = {
      caseNumber,
      analysisDate: new Date().toISOString(),
      summary: {
        successProbability: analysisResult.successProbability,
        riskLevel: analysisResult.riskLevel,
        recommendation: analysisResult.recommendation,
        goldSuggestions: analysisResult.goldSuggestions
      },
      judgeDNA: analysisResult.judgeDNA,
      redTeam: analysisResult.redTeam,
      heatmap: analysisResult.heatmap
    };

    // 4. Salvar no banco
    await supabase.from('analysis_history').insert({
      user_id: userId,
      type: 'predictive',
      input_data: { caseNumber, caseDescription, caseType },
      result: fullResult
    });

    return new Response(JSON.stringify(fullResult), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});