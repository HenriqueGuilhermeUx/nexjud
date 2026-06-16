import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

serve(async (req) => {
  // Apenas aceita requisições do tipo POST vindas da Woovi
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Converte o payload enviado pela Woovi
    const body = await req.json();
    console.log("Notificação de Webhook recebida da Woovi:", JSON.stringify(body));

    const event = body.event; 
    const wooviSubscriptionId = body.subscription?.id;

    if (!wooviSubscriptionId) {
      return new Response(JSON.stringify({ error: 'ID de assinatura não identificado' }), { status: 400 });
    }

    // Tratamento dos eventos de recorrência
    switch (event) {
      case 'subscription.paid':
        // Ativa o plano do cliente na NexJud e atualiza o vencimento
        const expiresAt = body.subscription.expiresAt ? new Date(body.subscription.expiresAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'active', 
            current_period_end: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('woovi_subscription_id', wooviSubscriptionId);
          
        console.log(`Assinatura ${wooviSubscriptionId} ativada/renovada com sucesso.`);
        break;

      case 'subscription.canceled':
      case 'subscription.expired':
        // Bloqueia ou suspende o acesso mudando o status para expirado
        await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('woovi_subscription_id', wooviSubscriptionId);
          
        console.log(`Assinatura ${wooviSubscriptionId} foi bloqueada ou cancelada.`);
        break;

      default:
        console.log(`Evento recebido ignorado: ${event}`);
    }

    // Retorna HTTP 200 de sucesso obrigatório para a Woovi interromper as tentativas de reenvio
    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Erro crítico no processamento do Webhook:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
})
