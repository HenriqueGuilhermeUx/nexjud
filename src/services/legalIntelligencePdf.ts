export function generateLegalIntelligencePdf(report: any) {
  const win = window.open("", "_blank")

  if (!win) {
    alert("Permita pop-ups para gerar o PDF.")
    return
  }

  const result = report.result || report
  const strategic = result.strategic || {}
  const warRoom = result.warRoom || {}
  const partnerCouncil = result.partnerCouncil || {}
  const opponent = result.opponent || {}
  const board = result.boardReport || {}

  const list = (items: any[] = [], icon = "•") =>
    Array.isArray(items)
      ? items.map((x) => `<li>${icon} ${String(x)}</li>`).join("")
      : ""

  win.document.write(`
    <html>
      <head>
        <title>NexJud Legal Intelligence Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 42px; color: #111827; }
          .header { border-bottom: 4px solid #6366f1; padding-bottom: 22px; margin-bottom: 28px; }
          .brand { font-size: 30px; font-weight: 800; }
          .subtitle { color: #6b7280; margin-top: 6px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
          .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:14px; padding:16px; }
          .label { font-size:12px; color:#6b7280; }
          .value { font-size:22px; font-weight:800; margin-top:6px; }
          h2 { margin-top: 30px; border-bottom:1px solid #e5e7eb; padding-bottom:8px; }
          .box { white-space: pre-wrap; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:14px; padding:16px; }
          li { margin-bottom:8px; }
          .footer { margin-top:46px; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:14px; }
          @media print { button { display:none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="padding:12px 20px;margin-bottom:24px;background:#6366f1;color:white;border:0;border-radius:8px;font-weight:bold;">
          Imprimir / Salvar PDF
        </button>

        <div class="header">
          <div class="brand">⚖ NexJud Legal Intelligence Report™</div>
          <div class="subtitle">Relatório executivo consolidado de inteligência jurídica</div>
          <div class="subtitle">${new Date(report.created_at || Date.now()).toLocaleString("pt-BR")}</div>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Chance</div><div class="value">${strategic.successProbability || 0}%</div></div>
          <div class="card"><div class="label">Risco</div><div class="value">${strategic.riskLevel || board.riskLevel || "-"}</div></div>
          <div class="card"><div class="label">Decisão</div><div class="value">${strategic.partnerDecision || board.decision || "-"}</div></div>
          <div class="card"><div class="label">Confiança</div><div class="value">${board.confidenceLevel || "-"}</div></div>
        </div>

        <h2>Resumo Executivo</h2>
        <div class="box">${strategic.executiveSummary || board.executiveSummary || "-"}</div>

        <h2>Strategic Analysis</h2>
        <div class="box">
Título: ${strategic.title || "-"}
Potencial financeiro: ${strategic.financialPotential || "-"}
Tese vencedora: ${strategic.winningThesis || "-"}
        </div>

        <h2>War Room</h2>
        <ul>${list(warRoom.risks, "🚨")}</ul>

        <h2>Partner Council</h2>
        <div class="box">
Voto final: ${partnerCouncil.finalVote || "-"}
Posição recomendada: ${partnerCouncil.recommendedPosition || "-"}
        </div>

        <h2>Opponent Intelligence</h2>
        <div class="box">
Perfil: ${opponent.profile || "-"}
Agressividade: ${opponent.aggressivenessLevel || "-"}
        </div>

        <h2>Ações Recomendadas</h2>
        <ul>${list(board.recommendedActions, "➜")}</ul>

        <div class="footer">
          Este relatório é apoio estratégico e não substitui análise jurídica profissional.
        </div>
      </body>
    </html>
  `)

  win.document.close()
}
