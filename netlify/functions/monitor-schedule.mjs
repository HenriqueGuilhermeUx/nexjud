// Agendador do monitor de processos (Netlify Scheduled Functions).
// - De hora em hora: verifica até 25 processos (DJEN + Escavador) — cada um no máximo 1x a cada 20 h.
// - Às 10:00 UTC (7h em Brasília): envia o resumo do dia por e-mail.
// O segredo MONITOR_CRON_SECRET é o mesmo na Netlify e no Supabase.

const FUNCTION_URL = 'https://zoruralbsxrbsaicihzu.supabase.co/functions/v1/case-monitor';

function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || process.env[name] || ''; } catch { return ''; }
}

export default async () => {
  const secret = env('MONITOR_CRON_SECRET');
  if (!secret) return new Response('monitor_not_configured', { status: 503 });
  const hour = new Date().getUTCHours();
  const jobs = hour === 10 ? ['check', 'digest'] : ['check'];
  const results = {};
  for (const job of jobs) {
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-nexjud-secret': secret },
        body: JSON.stringify({ job }),
        signal: AbortSignal.timeout(140_000),
      });
      results[job] = response.status;
    } catch (error) {
      results[job] = error?.name || 'error';
    }
  }
  console.log('monitor-schedule', JSON.stringify(results));
  return new Response(JSON.stringify(results), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '@hourly' };
