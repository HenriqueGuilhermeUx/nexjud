export function generateStrategicPdf(analysis: any) {
  const win = window.open("", "_blank")

  if (!win) {
    alert("Permita pop-ups para gerar o PDF.")
    return
  }

  const dealBreakers = Array.isArray(analysis.deal_breakers)
    ? analysis.deal_breakers
    : []

  const redTeam = Array.isArray(analysis.red_team)
    ? analysis.red_team
    : []

  const strategy = Array.isArray(analysis.strategy_engine)
    ? analysis.strategy_engine
    : []

  const caseDna = analysis.case_dna || {}

  win.document.write(`
    <html>
      <head>
        <title>NexJud Strategic Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #111827;
          }

          .header {
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }

          .brand {
            font-size: 28px;
            font-weight: bold;
            color: #111827;
          }

          .subtitle {
            color: #6b7280;
            margin-top: 6px;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 30px;
          }

          .card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            background: #f9fafb;
          }

          .label {
            font-size: 12px;
            color: #6b7280;
          }

          .value {
            font-size: 22px;
            font-weight: bold;
            margin-top: 6px;
          }

          h2 {
            margin-top: 30px;
            color: #111827;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
          }

          li {
            margin-bottom: 8px;
          }

          .case-box {
            white-space: pre-wrap;
            background: #f3f4f6;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #e5e7eb;
          }

          .footer {
            margin-top: 50px;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <button onclick="window.print()" style="padding:12px 20px;margin-bottom:24px;background:#6366f1;color:white;border:0;border-radius:8px;font-weight:bold;">
          Imprimir / Salvar PDF
        </button>

        <div class="header">
          <div class="brand">⚖ NexJud Strategic Report™</div>
          <div class="subtitle">Relatório executivo de inteligência jurídica</div>
          <div class="subtitle">${new Date(analysis.created_at || Date.now()).toLocaleString("pt-BR")}</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="label">Chance de Êxito</div>
            <div class="value">${analysis.success_probability || 0}%</div>
          </div>

          <div class="card">
            <div class="label">Risco</div>
            <div class="value">${analysis.risk_level || "-"}</div>
          </div>

          <div class="card">
            <div class="label">Potencial</div>
            <div class="value">${analysis.financial_potential || "-"}</div>
          </div>

          <div class="card">
            <div class="label">Sócio IA</div>
            <div class="value">${analysis.partner_decision || "-"}</div>
          </div>
        </div>

        <h2>Resumo do Caso</h2>
        <div class="case-box">${analysis.case_text || "-"}</div>

        <h2>Case DNA™</h2>
        <ul>
          ${Object.entries(caseDna)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join("")}
        </ul>

        <h2>Deal Breakers™</h2>
        <ul>
          ${dealBreakers.map((item: string) => `<li>❌ ${item}</li>`).join("")}
        </ul>

        <h2>Red Team™</h2>
        <ul>
          ${redTeam.map((item: string) => `<li>⚔️ ${item}</li>`).join("")}
        </ul>

        <h2>Strategy Engine™</h2>
        <ul>
          ${strategy.map((item: string) => `<li>✓ ${item}</li>`).join("")}
        </ul>

        <h2>Conclusão Executiva</h2>
        <p>
          Com base nos fatores analisados, o NexJud recomenda cautela estratégica,
          reforço probatório e validação jurídica final pelo advogado responsável.
        </p>

        <div class="footer">
          Este relatório é apoio estratégico e não substitui a análise jurídica profissional.
          A decisão final é sempre do advogado responsável.
        </div>
      </body>
    </html>
  `)

  win.document.close()
}
