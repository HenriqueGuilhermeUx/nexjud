// Supabase Edge Function: Setup Zero por OAB
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@^1";

interface OABInput {
  oabNumber: string
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
    const escavadorKey = Deno.env.get('ESCAVADOR_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { oabNumber, userId }: OABInput = await req.json();

    let cases: any[] = [];
    let stats = {
      totalCases: 0,
      totalValue: 0,
      victories: 0,
      defeats: 0,
      pending: 0,
      successRate: 0
    };

    // 1. Tentar buscar via CNJ DataJud (gratuito)
    try {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const dateFrom = twoYearsAgo.toISOString().split('T')[0];

      const cnpResponse = await fetch(
        `https://api-publica.datajud.cnj.jus.br/api_publica_trf3/_search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: {
              match: {
                "advogados.numero": oabNumber.replace(/\D/g, '')
              }
            },
            from: 0,
            size: 50,
            sort: [{ "dataUltimaAtualizacao": { order: "desc" } }]
          })
        }
      );

      if (cnpResponse.ok) {
        const cnpData = await cnpResponse.json();
        const hits = cnpData?.hits?.hits || [];

        cases = hits.map((hit: any) => {
          const source = hit._source;
          return {
            id: hit._id,
            caseNumber: source.numero || 'N/A',
            tribunal: source.tribunal || 'Não identificado',
            natureza: source.classe?.nome || 'Não identificado',
            valor: source.valorCausa || 0,
            status: normalizeStatus(source.movimentos?.slice(-1)[0]?.tipo || ''),
            judge: source.ultimoMovimento?.usuario?.nome || 'Não identificado',
            lastMovement: source.ultimaAtualizacaoData || new Date().toISOString()
          };
        });
      }
    } catch (cnjError) {
      console.log('CNJ DataJud não disponível, tentando Escavador...');
    }

    // 2. Fallback para Escavador se CNJ não retornou nada
    if (cases.length === 0) {
      try {
        const escavadorResponse = await fetch(
          `https://api.escavador.com/api/v2/processos?q=${encodeURIComponent(oabNumber)}`,
          {
            headers: {
              'Authorization': `Bearer ${escavadorKey}`,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/json'
            }
          }
        );

        if (escavadorResponse.ok) {
          const escavadorData = await escavadorResponse.json();
          const items = escavadorData?.items || escavadorData?.processos || [];

          cases = items.map((p: any) => ({
            id: p.id || p.numero_cnj,
            caseNumber: p.numero_cnj || p.numero || 'N/A',
            tribunal: p.tribunal?.sigla || p.tribunal || 'Não identificado',
            natureza: p.natureza || p.tipo || 'Não identificado',
            valor: p.valor_causa || 0,
            status: normalizeStatus(p.ultima_movimentacao?.tipo || p.status || ''),
            judge: p.juiz?.nome || p.magistrado || 'Não identificado',
            lastMovement: p.ultima_movimentacao?.data || new Date().toISOString()
          }));
        }
      } catch (escavadorError) {
        console.log('Escavador API não disponível');
      }
    }

    // 3. Calcular estatísticas
    if (cases.length > 0) {
      stats = {
        totalCases: cases.length,
        totalValue: cases.reduce((sum: number, c: any) => sum + (c.valor || 0), 0),
        victories: cases.filter((c: any) => c.status === 'Vitória').length,
        defeats: cases.filter((c: any) => c.status === 'Derrota').length,
        pending: cases.filter((c: any) => c.status === 'Aguardando').length,
        successRate: cases.length > 0
          ? Math.round((cases.filter((c: any) => c.status === 'Vitória').length / cases.length) * 100)
          : 0
      };
    }

    // 4. Salvar no banco
    await supabase.from('analysis_history').insert({
      user_id: userId,
      type: 'oab_setup',
      input_data: { oabNumber },
      result: { cases, stats }
    });

    const response = {
      success: true,
      message: `Setup Zero completado! ${cases.length} processos carregados.`,
      cases,
      stats,
      oabNumber,
      loadedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});

// Helper para normalizar status
function normalizeStatus(rawStatus: string): "Vitória" | "Derrota" | "Aguardando" {
  const s = (rawStatus || "").toLowerCase();
  if (s.includes("procedente") || s.includes("ganho") || s.includes("favorável") || s.includes("improcedente")) {
    return "Vitória";
  }
  if (s.includes("negado") || s.includes("rejeitado") || s.includes("parcialmente")) {
    return "Derrota";
  }
  return "Aguardando";
}