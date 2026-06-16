import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Trata a requisição de pré-vôo do CORS (obrigatório para chamadas de frontend)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const WOOVI_API_KEY = Deno.env.get('WOOVI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!WOOVI_API_KEY) {
      throw new Error('A variável de ambiente WOOVI_API_KEY não foi configurada.');
    }

    // Inicializa o cliente do Supabase com privilégios de Service Role (ignora RLS para gravação interna)
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obtém o token JWT do utilizador autenticado enviado pelo Frontend
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta o token de autorização' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Utilizador não autenticado ou inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrai o corpo da requisição
    const { action, planId, customer } = await req.json();

    if (action !== 'create') {
      return new Response(JSON.stringify({ error: 'Ação não suportada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Comunicação com a API da Woovi
    const wooviResponse = await fetch('https://api.woovi.com/v1/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOOVI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          name: customer.name,
          email: customer.email,
          taxID: customer.taxID, // CPF ou CNPJ
        },
        plan: planId,
        paymentMethod: 'PIX',
      }),
    });

    const wooviData = await wooviResponse.json();

    if (!wooviResponse.ok) {
      console.error('Erro retornado pela Woovi:', wooviData);
      throw new Error(wooviData.error || 'Erro ao processar assinatura na Woovi');
    }

    // Regista a assinatura com status 'pending' vinculada ao utilizador no banco de dados da NexJud
    const { error: dbError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: user.id,
        woovi_subscription_id: wooviData.subscription.id,
        status: 'pending',
        plan_id: planId,
      });

    if (dbError) {
      console.error('Erro ao guardar assinatura no banco:', dbError);
      throw new Error('Falha ao registar dados de pagamento internamente.');
    }

    // Retorna os dados para exibição do QR Code no ecrã
    return new Response(
      JSON.stringify({
        success: true,
        qrcode: wooviData.pix.qrcode,
        brCode: wooviData.pix.brCode, // Chave Copia e Cola
        subscriptionId: wooviData.subscription.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
