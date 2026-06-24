export function generateBoardReportPdf(report: any) {
  const win = window.open("", "_blank")

  if (!win) {
    alert("Permita pop-ups para gerar o PDF.")
    return
  }

  const data = report.data || {}

  win.document.write(`
    <html>
      <head>
        <title>NexJud Board Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
          .header { border-bottom: 4px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 30px; font-weight: bold; }
          .subtitle { color: #6b7280; margin-top: 6px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 25px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; background: #f9fafb; }
          .label { font-size: 12px; color: #6b7280; }
          .value { font-size: 24px; font-weight: bold; margin-top: 6px; }
          h2 { margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .box { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; white-space: pre-wrap; }
          .footer { margin-top: 50px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; }
          @media print { button { display: none; } }
        </style>
      </head>

      <body>
        <button onclick="window.print()" style="padding:12px 20px;margin-bottom:24px;background:#6366f1;color:white;border:0;border-radius:8px;font-weight:bold;">
          Imprimir / Salvar PDF
        </button>

        <div class="header">
          <div class="brand">⚖ NexJud Board Report™</div>
          <div class="subtitle">Relatório executivo para sócios, diretoria ou cliente corporativo</div>
          <div class="subtitle">${new Date(report.created_at || Date.now()).toLocaleString("pt-BR")}</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="label">Decisão Executiva</div>
            <div class="value">${report.decision || "-"}</div>
          </div>

          <div class="card">
            <div class="label">Nível de Risco</div>
            <div class="value">${report.risk_level || "-"}</div>
          </div>

          <div class="card">
            <div class="label">Processos Monitorados</div>
            <div class="value">${data.totalProcesses || 0}</div>
          </div>
        </div>

        <h2>Resumo Executivo</h2>
        <div class="box">${report.summary || "-"}</div>

        <h2>Impacto Financeiro</h2>
        <div class="box">${report.financial_impact || "-"}</div>

        <h2>Sinais Críticos</h2>
        <div class="box">
Processos críticos identificados: ${data.criticalProcesses || 0}

Tribunal DNA: ${data.tribunalResult?.profile || "Não calculado"}

Opponent Intelligence: ${data.opponentResult?.profile || "Não calculado"}

Client Risk: ${data.clientRiskResult?.risk_level || "Não calculado"}
        </div>

        <h2>Recomendação NexJud</h2>
        <div class="box">
A recomendação é revisar os processos críticos, atualizar andamentos via DataJud/CNJ e priorizar casos com maior exposição financeira, maior risco processual ou sinais de litigância agressiva da parte adversa.
        </div>

        <div class="footer">
          Este relatório é apoio executivo e estratégico. Não substitui análise jurídica profissional.
        </div>
      </body>
    </html>
  `)

  win.document.close()
}
